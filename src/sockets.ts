import type { SessionEnv } from "./auth/session.ts";
import { getUserPublicKey, getUserProfile, setUserStatus } from "./lib/data.ts";
import { getSubscribers } from "./users/user.ts";
import * as openpgp from "openpgp";
import type { TokenPayload, UserProfile } from "./types.ts";
import * as JsBin from "@debutter/jsbin";
import type { Context, Input } from "hono";
import type { WSContext, WSEvents } from "hono/ws";
import type { ServerWebSocket } from "bun";

/** Usernames mapped to streams */
const clientStreams: Map<string, Stream> = new Map();

class Stream {
	#sockets: WSContext<ServerWebSocket<undefined>>[];
	#session: TokenPayload;
	#pings: number;
	#pingInterval: NodeJS.Timeout | null;
	#memory: Uint8Array[];

	constructor(
		ws: WSContext<ServerWebSocket<undefined>>,
		session: TokenPayload
	) {
		this.#sockets = [];
		this.#session = session;
		this.remix(ws);
		this.#pings = 0;
		this.#pingInterval = null;
		this.#memory = [];
		this.#initPings();
	}

	async send(data: Uint8Array) {
		// TODO: Figure out the proper type of the data
		const key = await getUserPublicKey(this.#session.username);
		if (!key) return; // We can assume that the user should have a public key

		let encrypted: Uint8Array;

		try {
			const encryptionKey = await openpgp.readKey({
				binaryKey: key
			});
			const messageBody = await openpgp.createMessage({
				binary: data
			});

			encrypted = await openpgp.encrypt({
				message: messageBody,
				encryptionKeys: encryptionKey,
				format: "binary"
			});
		} catch (error) {
			console.error("Failed to encrypt message", error);
			return;
		}

		if (this.isAlive()) {
			for (const ws of this.#sockets) {
				ws.send(encrypted);
			}
		} else {
			this.#memory.push(encrypted);
		}
	}
	async json(data: object) {
		await this.send(JsBin.encode(data));
	}
	#initPings() {
		if (this.#pingInterval !== null) clearInterval(this.#pingInterval);

		this.#pingInterval = setInterval(() => {
			if (!this.isAlive()) {
				if (this.#pingInterval !== null)
					clearInterval(this.#pingInterval);
				return;
			}

			this.json({
				event: "ping",
				ping: this.#pings++
			});
		}, 40_000);
	}
	isAlive() {
		for (const ws of this.#sockets) {
			if (ws.readyState === 1) return true;
		}
		return false;
	}
	flushMemory() {
		if (!this.isAlive()) return false;

		for (const msg of this.#memory) {
			for (const ws of this.#sockets) {
				ws.send(msg);
			}
		}
		this.#memory = [];
		return true;
	}
	remix(ws: WSContext<ServerWebSocket<undefined>>) {
		this.#sockets.push(ws);

		setOnlineStatus(this.#session.username, true);
	}
	onClose() {
		setOnlineStatus(this.#session.username, this.isAlive());

		this.#sockets = this.#sockets.filter((sock) => sock.readyState === 1);
	}
}

export const route = (ctx: Context<SessionEnv, string, Input>) =>
	({
		async onOpen(_event, ws) {
			const payload = ctx.var.session;

			// Check if the user doesn't have a public key
			if ((await getUserPublicKey(payload.username)) === null) {
				ws.send(
					JSON.stringify({
						success: false,
						message: "Unknown public key",
						code: 107
					})
				);
				ws.close();
				return;
			}

			// Initialize the stream
			let stream: Stream;

			const existingStream = clientStreams.get(payload.username);

			if (existingStream instanceof Stream) {
				stream = existingStream;
				stream.remix(ws);
			} else {
				stream = new Stream(ws, payload);
				clientStreams.set(payload.username, stream);
			}

			stream.json({
				event: "connect",
				opened: true
			});
		},
		onClose: () => {
			const payload = ctx.var.session;
			const stream = clientStreams.get(payload.username);

			if (stream instanceof Stream) {
				stream.onClose();
			}
		},
		onError: (error) => console.error("Websocket error", error)
	} as WSEvents<ServerWebSocket<undefined>>);

export function getStream(username: string) {
	const stream = clientStreams.get(username);
	if (!(stream instanceof Stream)) return null;
	return stream;
}

async function setOnlineStatus(username: string, online: boolean) {
	const userSession = await getUserProfile(username);
	if (userSession !== null) {
		const changed = userSession.online !== online;

		await setUserStatus(username, online);

		if (changed) {
			await updateUserSubscribers(username, userSession);
		}
	}
}

async function updateUserSubscribers(
	username: string,
	userProfile: UserProfile
) {
	const viewers = await getSubscribers(username);

	for (const subscriber of viewers) {
		const stream = getStream(subscriber);

		if (stream !== null) {
			stream.json({
				event: "updateUser",
				username: userProfile.username,
				data: {
					username: userProfile.username,
					color: userProfile.color,
					offline: !userProfile.online // TODO: Change this to a online field
				},
				timestamp: Date.now()
			});
		}
	}
}

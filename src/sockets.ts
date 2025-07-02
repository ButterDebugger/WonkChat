import type { SessionEnv } from "./auth/session.ts";
import { getUserPublicKey, getUserProfile, setUserStatus } from "./lib/data.ts";
import { getSubscribers } from "./users/user.ts";
import * as openpgp from "openpgp";
import type { TokenPayload, UserProfile, WSData } from "./types.ts";
import * as TruffleByte from "@debutter/trufflebyte";
import type { Context, Input } from "hono";
import type { WSContext, WSEvents, WSMessageReceive } from "hono/ws";
import type { ServerWebSocket } from "bun";
import { Snowflake } from "./lib/structures.ts";

/** Usernames mapped to a record of websocket ids to streams */
const clientStreams: Map<string, Waterfall> = new Map();

class Waterfall {
	/** Websocket IDs mapped to streams */
	#streams: Record<string, Stream> = {};
	/** Username / ID of the user this waterfall belongs to */
	#username: string;

	constructor(username: string) {
		this.#username = username;
	}

	/** Sends a message to all streams in the waterfall */
	async send(data: object) {
		for (const stream of Object.values(this.#streams)) {
			await stream.send(data);
		}
	}

	/** Emits a message event to the corresponding stream */
	onMessage(data: WSMessageReceive, ws: WSContext<ServerWebSocket<WSData>>) {
		const stream = this.getByWs(ws);
		if (stream === null) return;

		// Emit message event
		stream.onMessage(data);
	}
	/** Emits a close event to the corresponding stream */
	onClose(ws: WSContext<ServerWebSocket<WSData>>) {
		const stream = this.getByWs(ws);
		if (stream === null) return;

		// Remove the stream from the list
		this.remove(ws);

		// Emit close event
		stream.onClose();
	}

	/** @returns The stream for the given websocket connection, or null if it doesn't exist */
	getByWs(ws: WSContext<ServerWebSocket<WSData>>): Stream | null {
		return this.#streams[ws.raw!.data.id] ?? null;
	}

	/** Creates a new stream and adds it to the waterfall */
	add(
		id: string,
		ws: WSContext<ServerWebSocket<WSData>>,
		session: TokenPayload
	) {
		if (session.username !== this.#username) return;

		// Create the stream
		const stream = new Stream(ws, session);
		ws.raw!.data.id = id;

		// Add the stream to the dictionary
		this.#streams[id] = stream;

		// Mark the user as online
		setOnlineStatus(this.#username, true);
	}

	/** Removes a stream from the waterfall based on the websocket connection */
	remove(ws: WSContext<ServerWebSocket<WSData>>) {
		const id = ws.raw!.data.id;

		delete this.#streams[id];

		// Mark the user as offline if there are no more streams
		if (Object.keys(this.#streams).length === 0) {
			setOnlineStatus(this.#username, false);
		}
	}
}

class Stream {
	#socket: WSContext<ServerWebSocket<WSData>>;
	#session: TokenPayload;
	#pings: number;
	#pingInterval: NodeJS.Timeout | null;

	constructor(ws: WSContext<ServerWebSocket<WSData>>, session: TokenPayload) {
		this.#socket = ws;

		this.#session = session;
		this.#pings = 0;
		this.#pingInterval = null;
		this.#initPings();
	}

	get socket() {
		return this.#socket;
	}

	async send(payload: object) {
		const data = TruffleByte.encode(payload);

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

		this.#socket.send(encrypted);
	}
	#initPings() {
		if (this.#pingInterval !== null) clearInterval(this.#pingInterval);

		this.#pingInterval = setInterval(() => {
			if (!this.isAlive()) {
				if (this.#pingInterval !== null)
					clearInterval(this.#pingInterval);
				return;
			}

			this.send({
				event: "ping",
				ping: this.#pings++
			});
		}, 40_000);
	}
	isAlive() {
		return this.#socket.readyState === 1;
	}
	onMessage(data: WSMessageReceive) {
		// TODO: Handle messages
	}
	onClose() {
		// TODO: Handle close
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

			// Initialize the websocket stream
			let stream = new Stream(ws, payload);
			ws.raw!.data.id = Snowflake.generate();

			// Get the waterfall for the user
			let waterfall = clientStreams.get(payload.username);

			if (!(waterfall instanceof Waterfall)) {
				waterfall = new Waterfall(payload.username);
			}

			// Add the stream to the waterfall
			waterfall.add(Snowflake.generate(), ws, payload);
			clientStreams.set(payload.username, waterfall);

			// Send connect message
			stream.send({
				event: "connect",
				opened: true
			});
		},
		onMessage(event, ws) {
			const payload = ctx.var.session;
			const waterfall = clientStreams.get(payload.username);
			if (waterfall === undefined) return;

			// Emit message event
			waterfall.onMessage(event.data, ws);
		},
		onClose: (_event, ws) => {
			const payload = ctx.var.session;
			const waterfall = clientStreams.get(payload.username);
			if (waterfall === undefined) return;

			// Emit close event
			waterfall.onClose(ws);
		},
		onError: (error) => console.error("Websocket error", error)
	} as WSEvents<ServerWebSocket<WSData>>);

/**
 * @returns The stream for the given username, or null if it either doesn't exist or isn't properly initialized
 */
export function getWaterfall(username: string): Waterfall | null {
	return clientStreams.get(username) ?? null;
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
		const waterfall = getWaterfall(subscriber);
		if (waterfall === null) continue;

		waterfall.send({
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

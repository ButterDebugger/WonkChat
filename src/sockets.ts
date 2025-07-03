import type { SessionEnv } from "./auth/session.ts";
import { getUserPublicKey, getUserProfile, setUserStatus } from "./lib/data.ts";
import * as openpgp from "openpgp";
import type { TokenPayload, WSData } from "./types.ts";
import * as TruffleByte from "@debutter/trufflebyte";
import type { Context, Input } from "hono";
import type { WSContext, WSEvents } from "hono/ws";
import type { ServerWebSocket } from "bun";
import { Snowflake } from "./lib/structures.ts";

/** Usernames mapped to a record of websocket ids to streams */
const clientStreams: Map<string, Waterfall> = new Map();
/** Subscription topics mapped to a set of streams */
const streamSubscriptions: Map<string, Set<Stream>> = new Map();

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
	onMessage(data: Record<string, unknown>, ws: WSSocket) {
		const stream = this.getByWs(ws);
		if (stream === null) return;

		// Emit message event
		stream.onMessage(data);
	}
	/** Emits a close event to the corresponding stream */
	onClose(ws: WSSocket) {
		const stream = this.getByWs(ws);
		if (stream === null) return;

		// Remove the stream from the list
		this.remove(ws);

		// Emit close event
		stream.onClose();
	}

	/** @returns The stream for the given websocket connection, or null if it doesn't exist */
	getByWs(ws: WSSocket): Stream | null {
		return this.#streams[ws.raw.data.id] ?? null;
	}

	/** Creates a new stream and adds it to the waterfall */
	add(id: string, ws: WSSocket, session: TokenPayload): Stream | null {
		if (session.username !== this.#username) return null;

		// Create the stream
		const stream = new Stream(ws, session);
		ws.raw.data.id = id;

		// Add the stream to the dictionary
		this.#streams[id] = stream;

		// Mark the user as online
		this.setOnlineStatus(true);

		// Return the stream
		return stream;
	}

	/** Removes a stream from the waterfall based on the websocket connection */
	remove(ws: WSSocket) {
		const id = ws.raw.data.id;

		delete this.#streams[id];

		// Mark the user as offline if there are no more streams
		if (Object.keys(this.#streams).length === 0) {
			this.setOnlineStatus(false);
		}
	}

	private async setOnlineStatus(online: boolean) {
		const userProfile = await getUserProfile(this.#username);
		if (userProfile !== null) {
			const changed = userProfile.online !== online;

			await setUserStatus(this.#username, online);

			if (changed) {
				const viewers =
					streamSubscriptions.get(`user:${this.#username}:updates`) ??
					new Set();

				for (const stream of viewers) {
					stream.send({
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
	}
}

class Stream {
	#socket: WSSocket;
	#session: TokenPayload;
	#pings: number;
	#pingInterval: NodeJS.Timeout | null;

	constructor(ws: WSSocket, session: TokenPayload) {
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
	onMessage(data: Record<string, unknown>) {
		// Handle messages
		const { event } = data;

		switch (event) {
			case "pong":
				this.send({
					event: "pong"
				});
				break;
			case "listen":
				const { subscriptions } = data;

				if (!Array.isArray(subscriptions)) break;

				// Create a set of valid subscriptions
				const newSubscriptions = new Set<string>();

				for (const listen of subscriptions) {
					if (typeof listen !== "string") continue;
					if (!/^(channel|user):([^:\s]+):([^:\s]+)$/gm.test(listen))
						continue;

					newSubscriptions.add(listen);
				}

				// Unsubscribe from the old subscriptions
				for (const listen of this.#socket.raw.data.subscriptions.difference(
					newSubscriptions
				)) {
					const streams =
						streamSubscriptions.get(listen) ?? new Set();
					streams.delete(this);
					streamSubscriptions.set(listen, streams);

					this.#socket.raw.data.subscriptions.delete(listen);
				}

				// Subscribe to new subscriptions
				for (const listen of newSubscriptions.difference(
					this.#socket.raw.data.subscriptions
				)) {
					const streams =
						streamSubscriptions.get(listen) ?? new Set();
					streams.add(this);
					streamSubscriptions.set(listen, streams);
				}

				// Update the set of subscriptions
				this.#socket.raw.data.subscriptions = newSubscriptions;
				break;
		}
	}
	onClose() {
		// Unsubscribe from all subscriptions
		for (const listen of this.#socket.raw.data.subscriptions) {
			const streams = streamSubscriptions.get(listen) ?? new Set();
			streams.delete(this);
			streamSubscriptions.set(listen, streams);
		}

		// Clear the ping interval
		if (this.#pingInterval !== null) clearInterval(this.#pingInterval);
	}
}

export const route = (ctx: Context<SessionEnv, string, Input>) =>
	({
		async onOpen(_event, ws) {
			// Check if the websocket is properly initialized
			if (!isWSSocket(ws)) {
				ws.send(
					JSON.stringify({
						success: false,
						message: "Internal server error",
						code: 106
					})
				);
				ws.close();
				return;
			}

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

			// Get the waterfall for the user
			let waterfall = clientStreams.get(payload.username);

			if (!(waterfall instanceof Waterfall)) {
				waterfall = new Waterfall(payload.username);
			}

			// Initialize the websocket stream to the waterfall
			const stream = waterfall.add(Snowflake.generate(), ws, payload);

			if (stream === null) {
				ws.send(
					JSON.stringify({
						success: false,
						message: "Internal server error",
						code: 106
					})
				);
				ws.close();
				return;
			}

			clientStreams.set(payload.username, waterfall);

			// Send connect message
			stream.send({
				event: "connect",
				opened: true
			});
		},
		async onMessage(event, ws) {
			// Check if the websocket is properly initialized
			if (!isWSSocket(ws)) {
				ws.send(
					JSON.stringify({
						success: false,
						message: "Internal server error",
						code: 106
					})
				);
				ws.close();
				return;
			}

			// Get the waterfall for the user
			const payload = ctx.var.session;
			const waterfall = clientStreams.get(payload.username);
			if (waterfall === undefined) return;

			// Decrypt the message
			let buffer: Uint8Array;

			if (event.data instanceof ArrayBuffer) {
				buffer = new Uint8Array(event.data);
			} else if (event.data instanceof Blob) {
				buffer = new Uint8Array(await event.data.arrayBuffer());
			} else {
				return;
			}

			const data = TruffleByte.decode(buffer);
			if (!isObject(data)) return;

			// Emit message event
			waterfall.onMessage(data, ws);
		},
		onClose: (_event, ws) => {
			// Check if the websocket is properly initialized
			if (!isWSSocket(ws)) {
				ws.send(
					JSON.stringify({
						success: false,
						message: "Internal server error",
						code: 106
					})
				);
				ws.close();
				return;
			}

			// Get the waterfall for the user
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

interface WSSocket extends WSContext<ServerWebSocket<WSData>> {
	raw: ServerWebSocket<WSData>;
}
function isWSSocket(ws: WSContext<ServerWebSocket<WSData>>): ws is WSSocket {
	// Check if the websocket is properly initialized
	if (ws.raw === undefined) return false;

	// Initialize default values
	if (ws.raw.data.id === undefined) {
		ws.raw.data.id = Snowflake.generate();
	}
	if (ws.raw.data.subscriptions === undefined) {
		ws.raw.data.subscriptions = new Set();
	}

	// Return true
	return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

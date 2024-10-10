import { authenticateRequest } from "./auth/session.js";
import { getUserPublicKey, getUserSession, setUserStatus } from "./lib/data.js";
import { getSubscribers } from "./gateway.js";
import * as openpgp from "openpgp";
import { WebSocket, WebSocketServer } from "ws";
import { Request } from "express";
import { TokenPayload } from "./types.js";

let clientStreams = new Map();

class Stream {
	sockets: WebSocket[];
	session: TokenPayload;
	pings: number;
	pingInterval: NodeJS.Timeout | null;
	memory: string[];

	constructor(ws: WebSocket, session: TokenPayload) {
		this.sockets = [];
		this.session = session;
		this.remix(ws);
		this.pings = 0;
		this.pingInterval = null;
		this.memory = [];
	}

	async send(data: any) {
		let key = await getUserPublicKey(this.session.username);
		let encrypted = await openpgp.encrypt({
			// TODO: make binary
			message: await openpgp.createMessage({ text: data }),
			encryptionKeys: await openpgp.readKey({ binaryKey: key })
		});
		let message = JSON.stringify(encrypted);

		if (this.isAlive()) {
			for (let ws of this.sockets) {
				ws.send(message);
			}
		} else {
			this.memory.push(message);
		}
	}
	async json(data: object) {
		await this.send(JSON.stringify(data));
	}
	initPings() {
		if (this.pingInterval !== null) clearInterval(this.pingInterval);

		this.pingInterval = setInterval(() => {
			if (!this.isAlive()) {
				if (this.pingInterval !== null)
					clearInterval(this.pingInterval);
				return;
			}

			this.json({
				event: "ping",
				ping: this.pings++
			});
		}, 40_000);
	}
	isAlive() {
		for (let ws of this.sockets) {
			if (ws.readyState === ws.OPEN) return true;
		}
		return false;
	}
	flushMemory() {
		if (!this.isAlive()) return false;

		this.memory.forEach((msg) => {
			for (let ws of this.sockets) {
				ws.send(msg);
			}
		});
		this.memory = [];
		return true;
	}
	remix(ws: WebSocket) {
		this.sockets.push(ws);

		setOnlineStatus(this.session.username, true);

		ws.on("close", () => {
			setOnlineStatus(this.session.username, this.isAlive());
			this.sockets = this.sockets.filter(
				(sock) => sock.readyState === sock.OPEN
			);
		});
	}
}

/**
 * Initializes the websocket server responsible for the event stream
 */
export default function (wss: WebSocketServer) {
	wss.on("connection", async (ws: WebSocket, req: Request) => {
		// Authenticate connection
		let payload = await authenticateRequest(req);

		if (payload === null) {
			ws.send(
				JSON.stringify({
					error: true,
					message: "Invalid credentials",
					code: 501
				})
			);
			ws.close();
			return;
		}

		// Check if the user doesn't have a public key
		if ((await getUserPublicKey(payload.username)) === null) {
			ws.send(
				JSON.stringify({
					error: true,
					message: "Unknown public key",
					code: 107
				})
			);
			ws.close();
			return;
		}

		// Initialize the stream
		let stream;
		if (clientStreams.has(payload.username)) {
			stream = clientStreams.get(payload.username);
			stream.remix(ws);
		} else {
			stream = new Stream(ws, payload);
			clientStreams.set(payload.username, stream);
		}

		stream.json({
			event: "connect",
			opened: true
		});

		stream.initPings();
	});
}

export function getStream(username: string) {
	let stream = clientStreams.get(username);
	if (!(stream instanceof Stream)) return null;
	return stream;
}

async function setOnlineStatus(username: string, online: boolean) {
	let userSession = await getUserSession(username);
	if (userSession !== null) {
		let changed = userSession.offline !== !online;

		await setUserStatus(username, online);

		if (changed) {
			await updateUserSubscribers(username, userSession);
		}
	}
}

async function updateUserSubscribers(username: string, userSession: any) {
	let viewers = await getSubscribers(username);

	viewers.forEach((subscriber) => {
		let stream = getStream(subscriber);

		if (stream !== null) {
			stream.json({
				event: "updateUser",
				username: userSession.username,
				data: {
					username: userSession.username,
					color: userSession.color,
					offline: userSession.offline
				},
				timestamp: Date.now()
			});
		}
	});
}

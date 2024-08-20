import express from "express";
import { getStream } from "../sockets.js";
import { authenticateMiddleware } from "../auth/session.js";
import {
	getUserSession,
	createRoom,
	getRoom,
	addUserToRoom,
	removeUserFromRoom
} from "../lib/data.js";
import * as openpgp from "openpgp";

export const router = new express.Router();

let userSubscriptions = new Map();

router.post(
	"/room/:roomname/join",
	authenticateMiddleware,
	async (req, res) => {
		let { roomname } = req.params;

		let userSession = await getUserSession(req.user.username);

		if (!isValidRoomName(roomname))
			return res.status(400).json({
				error: true,
				message: "Invalid room name",
				code: 301
			});

		if (userSession.rooms.has(roomname))
			return res.status(400).json({
				error: true,
				message: "Already joined this room",
				code: 302
			});

		let room = await getRoom(roomname);

		if (room === null)
			return res.status(400).json({
				error: true,
				message: "Room doesn't exist",
				code: 303
			});

		let success = await addUserToRoom(req.user.username, roomname);

		if (success === null)
			return res.status(500).json({
				error: true,
				message: "Internal server error",
				code: 106
			});

		for (let username of room.members) {
			if (username === req.user.username) continue;

			let stream = getStream(username);
			if (stream === null) continue;

			stream.json({
				event: "updateMember",
				room: roomname,
				username: req.user.username,
				timestamp: Date.now(),
				state: "join"
			});
		}

		res.status(200).json({
			name: room.name,
			description: room.description,
			key: room.armoredPublicKey,
			members: Array.from(room.members),
			success: true
		});
	}
);

router.post(
	"/room/:roomname/leave",
	authenticateMiddleware,
	async (req, res) => {
		let { roomname } = req.params;

		let userSession = await getUserSession(req.user.username);

		if (!userSession.rooms.has(roomname))
			return res.status(400).json({
				error: true,
				message: "Cannot leave a room that you are already not in",
				code: 306
			});

		let room = await getRoom(roomname);

		if (room === null)
			return res.status(400).json({
				error: true,
				message: "Room doesn't exist",
				code: 303
			});

		let success = await removeUserFromRoom(req.user.username, roomname);

		if (success === null)
			return res.status(500).json({
				error: true,
				message: "Internal server error",
				code: 106
			});

		for (let username of room.members) {
			if (username === req.user.username) continue;

			let stream = getStream(username);
			if (stream === null) continue;

			stream.json({
				event: "updateMember",
				room: roomname,
				username: req.user.username,
				timestamp: Date.now(),
				state: "leave"
			});
		}

		res.status(200).json({
			success: true
		});
	}
);

router.get(
	"/room/:roomname/members",
	authenticateMiddleware,
	async (req, res) => {
		// TODO: deprecate this in favor of /room/:roomname/info
		let { roomname } = req.params;

		let userSession = await getUserSession(req.user.username);

		if (!userSession.rooms.has(roomname))
			return res.status(400).json({
				error: true,
				message: "Cannot query info about a room that you are not in",
				code: 307
			});

		let room = await getRoom(roomname);

		if (room === null)
			return res.status(400).json({
				error: true,
				message: "Room doesn't exist",
				code: 303
			});

		res.status(200).json({
			members: Array.from(room.members),
			success: true
		});
	}
);

router.post(
	"/room/:roomname/create",
	authenticateMiddleware,
	async (req, res) => {
		let { roomname } = req.params;

		if (!isValidRoomName(roomname))
			return res.status(400).json({
				error: true,
				message: "Invalid room name",
				code: 301
			});

		let room = await createRoom(roomname);

		if (room === false)
			return res.status(400).json({
				error: true,
				message: "Room already exist",
				code: 305
			});

		res.status(200).json({
			success: true
		});
	}
);

router.post(
	"/room/:roomname/message",
	authenticateMiddleware,
	async (req, res) => {
		let { roomname } = req.params;

		let userSession = await getUserSession(req.user.username);

		if (!userSession.rooms.has(roomname))
			return res.status(400).json({
				error: true,
				message: "Cannot send a message in a room that you are not in",
				code: 304
			});

		let room = await getRoom(roomname);

		if (room === null)
			return res.status(400).json({
				error: true,
				message: "Room doesn't exist",
				code: 303
			});

		let { message } = req.body;

		if (typeof message !== "string")
			return res.status(400).json({
				error: true,
				message: "Invalid body",
				code: 101
			});

		let decrypted;
		try {
			let { data } = await openpgp.decrypt({
				message: await openpgp.readMessage({ armoredMessage: message }),
				decryptionKeys: await openpgp.readKey({
					binaryKey: room.privateKey
				})
			});

			if (!data.startsWith("{"))
				throw new TypeError("Invalid data type.");

			decrypted = JSON.parse(data);
		} catch (error) {
			return res.status(400).json({
				error: true,
				message: "Invalid encrypted body",
				code: 104
			});
		}

		let { content, attachments } = decrypted;

		if (typeof content !== "string" || !Array.isArray(attachments))
			return res.status(400).json({
				error: true,
				message: "Invalid encrypted body",
				code: 104
			});

		if (content.length > 1000 || content.replace(/\s/g, "").length == 0)
			return res.status(400).json({
				error: true,
				message: "Invalid message content",
				code: 201
			});

		for (let username of room.members) {
			let stream = getStream(username);
			if (stream === null) continue;

			stream.json({
				event: "message",
				author: {
					username: userSession.username,
					color: userSession.color,
					offline: userSession.offline
				},
				room: roomname,
				content: content,
				attachments: attachments,
				timestamp: Date.now()
			});
		}

		res.status(200).json({
			success: true
		});
	}
);

router.get("/room/:roomname/info", authenticateMiddleware, async (req, res) => {
	let { roomname } = req.params;

	let userSession = await getUserSession(req.user.username);

	if (!userSession.rooms.has(roomname))
		return res.status(400).json({
			error: true,
			message: "Cannot query info about a room that you are not in",
			code: 307
		});

	let room = await getRoom(roomname);

	if (room === null)
		return res.status(400).json({
			error: true,
			message: "Room doesn't exist",
			code: 303
		});

	res.status(200).json({
		name: room.name,
		description: room.description,
		key: room.armoredPublicKey,
		members: Array.from(room.members),
		success: true
	});
});

router.post("/room/:roomname/typing", authenticateMiddleware, (req, res) => {
	let { roomname } = req.params;

	// TODO: finish this
});

function isValidRoomName(roomname) {
	if (typeof roomname !== "string") return false;

	return /^[a-z0-9_]{3,16}$/g.test(roomname);
}

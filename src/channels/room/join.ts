import type { Request, Response } from "express";
import { getStream } from "../../sockets.js";
import { authenticateHandler } from "../../auth/session.js";
import { getUserSession, getRoom, addUserToRoom } from "../../lib/data.js";
import { isValidRoomName } from "../room.js";

export default async (
	req: Request<{
		roomname: string;
	}>,
	res: Response,
) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { roomname } = req.params;

	const userSession = await getUserSession(tokenPayload.username);

	if (!isValidRoomName(roomname))
		return res.status(400).json({
			error: true,
			message: "Invalid room name",
			code: 301,
		});

	if (userSession.rooms.has(roomname))
		return res.status(400).json({
			error: true,
			message: "Already joined this room",
			code: 302,
		});

	const room = await getRoom(roomname);

	if (room === null)
		return res.status(400).json({
			error: true,
			message: "Room doesn't exist",
			code: 303,
		});

	const success = await addUserToRoom(tokenPayload.username, roomname);

	if (success === null)
		return res.status(500).json({
			error: true,
			message: "Internal server error",
			code: 106,
		});

	for (const username of room.members) {
		if (username === tokenPayload.username) continue;

		const stream = getStream(username);
		if (stream === null) continue;

		stream.json({
			event: "updateMember",
			room: roomname,
			username: tokenPayload.username,
			timestamp: Date.now(),
			state: "join",
		});
	}

	res.status(200).json({
		name: room.name,
		description: room.description,
		key: room.armoredPublicKey,
		members: Array.from(room.members),
		success: true,
	});
};

import type { Request, Response } from "express";
import { getStream } from "../../sockets.js";
import { authenticateHandler } from "../../auth/session.js";
import { getUserSession, getRoom, removeUserFromRoom } from "../../lib/data.js";

export default async (
	req: Request<{
		roomname: string;
	}>,
	res: Response
) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { roomname } = req.params;

	const userSession = await getUserSession(tokenPayload.username);
	if (userSession === null)
		return res.status(400).json({
			error: true,
			message: "User session does not exist",
			code: 507
		});

	if (!userSession.rooms.has(roomname))
		return res.status(400).json({
			error: true,
			message: "Cannot leave a room that you are already not in",
			code: 306
		});

	const room = await getRoom(roomname);

	if (room === null)
		return res.status(400).json({
			error: true,
			message: "Room doesn't exist",
			code: 303
		});

	const success = await removeUserFromRoom(tokenPayload.username, roomname);

	if (success === null)
		return res.status(500).json({
			error: true,
			message: "Internal server error",
			code: 106
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
			state: "leave"
		});
	}

	res.status(200).json({
		success: true
	});
};

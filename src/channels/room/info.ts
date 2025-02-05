import type { Request, Response } from "express";
import { authenticateHandler } from "../../auth/session.js";
import { getRoom, getUserSession } from "../../lib/data.js";

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
			message: "Cannot query info about a room that you are not in",
			code: 307
		});

	const room = await getRoom(roomname);

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
};

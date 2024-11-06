import type { Request, Response } from "express";
import { authenticateHandler } from "../../auth/session.js";
import { createRoom } from "../../lib/data.js";
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

	if (!isValidRoomName(roomname))
		return res.status(400).json({
			error: true,
			message: "Invalid room name",
			code: 301,
		});

	const room = await createRoom(roomname);

	if (room === false)
		return res.status(400).json({
			error: true,
			message: "Room already exist",
			code: 305,
		});

	res.status(200).json({
		success: true,
	});
};

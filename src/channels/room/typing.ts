import type { Request, Response } from "express";
import { authenticateHandler } from "../../auth/session.js";

export default async (
	req: Request<{
		roomname: string;
	}>,
	res: Response,
) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { roomname } = req.params;

	// TODO: finish this
};

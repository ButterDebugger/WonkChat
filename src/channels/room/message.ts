import type { Request, Response } from "express";
import { getStream } from "../../sockets.js";
import { authenticateHandler } from "../../auth/session.js";
import { getUserSession, getRoom } from "../../lib/data.js";
import * as openpgp from "openpgp";
import { isMessage, type Message } from "../../types.js";

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
			message: "Cannot send a message in a room that you are not in",
			code: 304
		});

	const room = await getRoom(roomname);

	if (room === null)
		return res.status(400).json({
			error: true,
			message: "Room doesn't exist",
			code: 303
		});

	const { message } = req.body;

	if (typeof message !== "string")
		return res.status(400).json({
			error: true,
			message: "Invalid body",
			code: 101
		});

	console.log(2);

	let decrypted: Message;
	try {
		const { data } = await openpgp.decrypt({
			message: await openpgp.readMessage({ armoredMessage: message }),
			decryptionKeys: await openpgp.readPrivateKey({
				binaryKey: room.privateKey
			})
		});

		if (typeof data !== "string" || !data.startsWith("{"))
			return res.status(400).json({
				error: true,
				message: "Invalid body",
				code: 101
			});

		decrypted = JSON.parse(data);
	} catch (error) {
		return res.status(400).json({
			error: true,
			message: "Invalid encrypted body",
			code: 104
		});
	}

	if (!isMessage(decrypted))
		return res.status(400).json({
			error: true,
			message: "Invalid encrypted body",
			code: 104
		});

	const { content, attachments } = decrypted;

	if (content.length > 1000 || content.replace(/\s/g, "").length === 0)
		return res.status(400).json({
			error: true,
			message: "Invalid message content",
			code: 201
		});

	for (const username of room.members) {
		const stream = getStream(username);
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
};

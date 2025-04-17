import { getStream } from "../../sockets.ts";
import { authMiddleware } from "../../auth/session.ts";
import { getUserSession, getRoom, addUserToRoom } from "../../lib/data.ts";
import { isValidRoomName } from "../room.ts";
import { Hono } from "hono";

const router = new Hono();

router.post("/:roomname/join", authMiddleware, async (ctx) => {
	const tokenPayload = ctx.var.session;
	const { roomname } = ctx.req.param();

	const userSession = await getUserSession(tokenPayload.username);

	if (!userSession)
		return ctx.json(
			{
				error: true,
				message: "User does not exist",
				code: 401
			},
			400
		);

	if (!isValidRoomName(roomname))
		return ctx.json(
			{
				error: true,
				message: "Invalid room name",
				code: 301
			},
			400
		);

	if (userSession.rooms.has(roomname))
		return ctx.json(
			{
				error: true,
				message: "Already joined this room",
				code: 302
			},
			400
		);

	const room = await getRoom(roomname);

	if (room === null)
		return ctx.json(
			{
				error: true,
				message: "Room doesn't exist",
				code: 303
			},
			400
		);

	const success = await addUserToRoom(tokenPayload.username, roomname);

	if (success === null)
		return ctx.json(
			{
				error: true,
				message: "Internal server error",
				code: 106
			},
			500
		);

	for (const username of room.members) {
		if (username === tokenPayload.username) continue;

		const stream = getStream(username);
		if (stream === null) continue;

		stream.json({
			event: "updateMember",
			room: roomname,
			username: tokenPayload.username,
			timestamp: Date.now(),
			state: "join"
		});
	}

	return ctx.json(
		{
			name: room.name,
			description: room.description,
			key: await room.armoredPublicKey,
			members: Array.from(room.members),
			success: true
		},
		200
	);
});

export default router;

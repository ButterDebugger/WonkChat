import { authMiddleware } from "../../auth/session.ts";
import { getRoom, getUserSession } from "../../lib/data.ts";
import { Hono } from "hono";

const router = new Hono();

router.get("/:roomname/info", authMiddleware, async (ctx) => {
	const tokenPayload = ctx.var.session;
	const { roomname } = ctx.req.param();

	const userSession = await getUserSession(tokenPayload.username);

	if (!userSession)
		return ctx.json(
			{
				error: true,
				message: "User does not exist",
				code: 401,
			},
			400,
		);

	if (!userSession.rooms.has(roomname))
		return ctx.json(
			{
				error: true,
				message: "Cannot query info about a room that you are not in",
				code: 307,
			},
			400,
		);

	const room = await getRoom(roomname);

	if (room === null)
		return ctx.json(
			{
				error: true,
				message: "Room doesn't exist",
				code: 303,
			},
			400,
		);

	return ctx.json(
		{
			name: room.name,
			description: room.description,
			key: room.publicKey,
			members: Array.from(room.members),
			success: true,
		},
		200,
	);
});

export default router;

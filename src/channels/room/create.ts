import { authMiddleware } from "../../auth/session.ts";
import { createRoom } from "../../lib/data.ts";
import { isValidRoomName } from "../room.ts";
import { Hono } from "hono";

const router = new Hono();

router.post("/:roomname/create", authMiddleware, async (ctx) => {
	const { roomname } = ctx.req.param();

	if (!isValidRoomName(roomname))
		return ctx.json(
			{
				error: true,
				message: "Invalid room name",
				code: 301
			},
			400
		);

	const room = await createRoom(roomname);

	if (room === false)
		return ctx.json(
			{
				error: true,
				message: "Room already exist",
				code: 305
			},
			400
		);

	return ctx.json(
		{
			success: true
		},
		200
	);
});

export default router;

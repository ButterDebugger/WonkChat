import { getStream } from "../../sockets.ts";
import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { getUserSession, getRoom, addUserToRoom } from "../../lib/data.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	HttpSessionHeadersSchema,
	RoomNameSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/:roomname/join",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				roomname: RoomNameSchema
			})
		},
		responses: {
			200: {
				description: "Success message"
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { roomname } = ctx.req.valid("param");

		const userSession = await getUserSession(tokenPayload.username);
		if (userSession === null)
			return ctx.json(
				{
					error: true,
					message: "User session does not exist",
					code: 507
				},
				400
			);

		if (!userSession)
			return ctx.json(
				{
					error: true,
					message: "User does not exist",
					code: 401
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
	}
);

export default router;

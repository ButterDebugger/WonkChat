import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { getRoom, getUserSession } from "../../lib/data.ts";
import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import {
	HttpSessionHeadersSchema,
	RoomNameSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/:roomname/info",
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

		if (!userSession.rooms.has(roomname))
			return ctx.json(
				{
					error: true,
					message:
						"Cannot query info about a room that you are not in",
					code: 307
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

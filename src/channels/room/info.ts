import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { getRoomById, getUserProfileByUsername } from "../../lib/data.ts";
import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	SnowflakeSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/:roomid/info",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				roomid: SnowflakeSchema
			})
		},
		responses: {
			200: {
				description: "Success message"
			},
			400: {
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				},
				description: "Returns an error"
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { roomid } = ctx.req.valid("param");

		const userSession = await getUserProfileByUsername(tokenPayload.username);
		if (userSession === null)
			return ctx.json(
				{
					success: false,
					message: "User session does not exist",
					code: 507
				},
				400
			);

		if (!userSession)
			return ctx.json(
				{
					success: false,
					message: "User does not exist",
					code: 401
				},
				400
			);

		if (!userSession.rooms.has(roomid))
			return ctx.json(
				{
					success: false,
					message:
						"Cannot query info about a room that you are not in",
					code: 307
				},
				400
			);

		const room = await getRoomById(roomid);

		if (room === null)
			return ctx.json(
				{
					success: false,
					message: "Room doesn't exist",
					code: 303
				},
				400
			);

		return ctx.json(
			{
				id: room.id,
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

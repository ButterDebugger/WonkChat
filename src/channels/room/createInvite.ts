import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { getUserProfileByUsername, getRoomById, createRoomInvite } from "../../lib/db/query.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	SnowflakeSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/:roomid/create-invite",
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
			},
			500: {
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				},
				description: "Something went wrong internally"
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { roomid } = ctx.req.valid("param");

		const userSession = await getUserProfileByUsername(tokenPayload.username);
		if (!userSession)
			return ctx.json(
				{
					success: false,
					message: "User session does not exist",
					code: 507
				},
				400
			);

		if (!userSession.rooms.has(roomid))
			return ctx.json(
				{
					success: false,
					message: "Cannot create an invite for a room that you are not in",
					code: 308
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

		const inviteCode = await createRoomInvite(roomid, tokenPayload.id);

		if (inviteCode === null)
			return ctx.json(
				{
					success: false,
					message: "Internal server error",
					code: 106
				},
				500
			);

		return ctx.json(
			{
				code: inviteCode,
				success: true
			},
			200
		);
	}
);

export default router;

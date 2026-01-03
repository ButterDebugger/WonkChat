import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { addUserToRoom, getRoomByInviteCode } from "../../lib/db/query.ts";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
} from "../../lib/validation.ts";
import { getWaterfall } from "../../sockets.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/use-invite",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			body: {
				content: {
					"application/json": {
						schema: z.object({
							code: z.string()
						})
					}
				}
			}
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
		const { code } = ctx.req.valid("json");

		const room = await getRoomByInviteCode(code);

		if (room === null)
			return ctx.json(
				{
					success: false,
					message: "Invalid invite code",
					code: 309
				},
				400
			);

		const success = await addUserToRoom(tokenPayload.username, room.id);

		if (success === null)
			return ctx.json(
				{
					success: false,
					message: "Internal server error",
					code: 106
				},
				500
			);

		for (const userId of room.members) {
			if (userId === tokenPayload.id) continue;

			const waterfall = getWaterfall(userId);
			if (waterfall === null) continue;

			waterfall.send({
				event: "roomMemberJoin",
				roomId: room.id,
				username: tokenPayload.username,
				timestamp: Date.now()
			});
		}

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

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { createRoom } from "../../lib/data.ts";
import {
	HttpSessionHeadersSchema,
	RoomNameSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/:roomname/create",
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
		const { roomname } = ctx.req.valid("param");

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
	}
);

export default router;

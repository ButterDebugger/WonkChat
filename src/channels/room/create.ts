import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { createRoom } from "../../lib/data.ts";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	RoomNameSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/create",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			body: {
				content: {
					"application/json": {
						schema: z.object({
							name: RoomNameSchema
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
		const { name: roomname } = ctx.req.valid("json");

		const room = await createRoom(roomname);

		if (!room)
			return ctx.json(
				{
					success: false,
					message: "Room already exist",
					code: 305
				},
				400
			);

		return ctx.json(
			{
				roomId: room.id,
				success: true
			},
			200
		);
	}
);

export default router;

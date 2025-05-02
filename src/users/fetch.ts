import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { getUserSession } from "../lib/data.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	UsernameSchema
} from "../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/user/:username/fetch",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				username: UsernameSchema
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
		const { username } = ctx.req.valid("param");

		const session = await getUserSession(username);

		if (!session)
			return ctx.json(
				{
					error: true,
					message: "User does not exist",
					code: 401
				},
				400
			);

		return ctx.json(
			{
				username: session.username,
				data: {
					username: session.username,
					color: session.color,
					offline: session.offline
				},
				success: true
			},
			200
		);
	}
);

export default router;

import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HttpSessionHeadersSchema, UsernameSchema } from "../lib/validation.ts";
import { removeSubscriber } from "./user.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/user/:username/unsubscribe",
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
			}
		}
	}),
	(ctx) => {
		const tokenPayload = ctx.var.session;
		const { username } = ctx.req.valid("param");

		// Remove subscriber
		removeSubscriber(username, tokenPayload.username);

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

export default router;

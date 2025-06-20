import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { getUserProfile } from "../lib/data.ts";
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

		const session = await getUserProfile(username);

		if (!session)
			return ctx.json(
				{
					success: false,
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
					displayName: session.displayName,
					pronouns: session.pronouns,
					avatar: session.avatar,
					bio: session.bio,
					color: session.color,
					offline: !session.online, // TODO: remove this
					online: session.online
				},
				success: true
			},
			200
		);
	}
);

export default router;

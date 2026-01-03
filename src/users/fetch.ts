import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { getUserProfileByUsername } from "../lib/data.ts";
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

		const userProfile = await getUserProfileByUsername(username);

		if (!userProfile)
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
				id: userProfile.id,
				data: {
					username: userProfile.username,
					displayName: userProfile.displayName,
					pronouns: userProfile.pronouns,
					avatar: userProfile.avatar,
					bio: userProfile.bio,
					color: userProfile.color,
					offline: !userProfile.online, // TODO: remove this
					online: userProfile.online
				},
				success: true
			},
			200
		);
	}
);

export default router;

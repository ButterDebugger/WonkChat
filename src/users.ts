import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { getUserSession, getUserViews } from "./lib/data.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	UsernameSchema
} from "./lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

const userSubscriptions = new Map<string, Set<string>>();

router.openapi(
	createRoute({
		method: "post",
		path: "/users/:username/subscribe",
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

		// Update list of subscribers
		const subscribers = userSubscriptions.get(username) ?? new Set();
		subscribers.add(tokenPayload.username);
		userSubscriptions.set(username, subscribers);

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

router.openapi(
	createRoute({
		method: "post",
		path: "/users/:username/unsubscribe",
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

		// Update list of subscribers
		const subscribers = userSubscriptions.get(username) ?? new Set();
		subscribers.delete(tokenPayload.username);
		userSubscriptions.set(username, subscribers);

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

router.openapi(
	createRoute({
		method: "get",
		path: "/users/:username/fetch",
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

export async function getSubscribers(username: string): Promise<string[]> {
	const viewers = (await getUserViews(username)) ?? new Set();
	const subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}

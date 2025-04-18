import { getStream } from "./sockets.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { router as roomRoute } from "./channels/room.ts";
import { getUserSession, getRoom, getUserViews } from "./lib/data.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	UsernameSchema
} from "./lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

const userSubscriptions = new Map<string, Set<string>>();

router.route("/room/", roomRoute);

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

router.openapi(
	createRoute({
		method: "get",
		path: "/sync/client",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema
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

		const session = await getUserSession(tokenPayload.username);
		let viewableUsers: Set<string> = new Set();

		if (!session)
			return ctx.json(
				{
					error: true,
					message: "User does not exist",
					code: 401
				},
				400
			);

		// Get rooms
		const rooms = [];
		for (const roomname of session.rooms) {
			const room = await getRoom(roomname);
			if (room === null) continue;

			viewableUsers = new Set([...viewableUsers, ...room.members]);

			rooms.push({
				name: room.name,
				description: room.description,
				key: await room.armoredPublicKey,
				members: Array.from(room.members)
			});
		}

		// Get viewable users
		viewableUsers.delete(session.username);

		const users = await Promise.all(
			Array.from(viewableUsers).map((username) =>
				getUserSession(username).then((session) => ({
					username: session?.username ?? username,
					color: session?.color ?? "#ffffff",
					offline: session?.offline ?? true
				}))
			)
		);

		return ctx.json(
			{
				rooms: rooms,
				users: users,
				you: {
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

router.openapi(
	createRoute({
		method: "get",
		path: "/sync/memory",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema
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
	(ctx) => {
		const tokenPayload = ctx.var.session;

		const stream = getStream(tokenPayload.username);
		if (stream === null)
			return ctx.json(
				{
					error: true,
					message: "Could not find an active stream",
					code: 601
				},
				400
			);

		const result = stream.flushMemory();

		if (!result)
			return ctx.json(
				{
					error: true,
					message: "Stream is currently inactive",
					code: 602
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

export async function getSubscribers(username: string): Promise<string[]> {
	const viewers = (await getUserViews(username)) ?? new Set();
	const subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}

import { getStream } from "./sockets.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { getUserSession, getRoom } from "./lib/data.ts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ErrorSchema, HttpSessionHeadersSchema } from "./lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

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

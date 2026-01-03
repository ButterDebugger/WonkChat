import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { getUserProfileByUsername, getRoomById } from "../lib/db/query.ts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ErrorSchema, HttpSessionHeadersSchema } from "../lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/",
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

		const session = await getUserProfileByUsername(tokenPayload.username);
		let viewableUsers: Set<string> = new Set();

		if (!session)
			return ctx.json(
				{
					success: false,
					message: "User does not exist",
					code: 401
				},
				400
			);

		// Get rooms
		const rooms: {
			id: string;
			name: string;
			description: string;
			key: string;
			members: string[];
		}[] = [];
		for (const roomId of session.rooms) {
			const room = await getRoomById(roomId);
			if (room === null) continue;

			viewableUsers = new Set([...viewableUsers, ...room.members]);

			rooms.push({
				id: room.id,
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
				getUserProfileByUsername(username).then((session) => ({
					id: session?.id ?? "",
					username: session?.username ?? username,
					color: session?.color ?? "#ffffff",
					offline: !(session?.online ?? false) // TODO: Change this to a online field
				}))
			)
		);

		return ctx.json(
			{
				rooms: rooms,
				users: users,
				you: {
					id: session.id,
					username: session.username,
					color: session.color,
					offline: !session.online // TODO: Change this to a online field
				},
				success: true
			},
			200
		);
	}
);

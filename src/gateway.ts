import { Hono } from "hono";
import { getStream } from "./sockets.ts";
import { authMiddleware } from "./auth/session.ts";
import { router as roomRoute } from "./channels/room.ts";
import { getUserSession, getRoom, getUserViews } from "./lib/data.ts";

export const router = new Hono();

const userSubscriptions = new Map();

router.route("/room/", roomRoute);

router.post("/users/:userid/subscribe", authMiddleware, (ctx) => {
	const tokenPayload = ctx.var.session;
	const { userid } = ctx.req.param();

	// Update list of subscribers
	const subscribers = userSubscriptions.get(userid) ?? new Set();
	subscribers.add(tokenPayload.username);
	userSubscriptions.set(userid, subscribers);

	return ctx.json(
		{
			success: true
		},
		200
	);
});

router.post("/users/:userid/unsubscribe", authMiddleware, (ctx) => {
	const tokenPayload = ctx.var.session;
	const { userid } = ctx.req.param();

	// Update list of subscribers
	const subscribers = userSubscriptions.get(userid) ?? new Set();
	subscribers.delete(tokenPayload.username);
	userSubscriptions.set(userid, subscribers);

	return ctx.json(
		{
			success: true
		},
		200
	);
});

router.get("/users/:username/fetch", authMiddleware, async (ctx) => {
	const { username } = ctx.req.param();

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
});

router.get("/sync/client", authMiddleware, async (ctx) => {
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
});

router.get("/sync/memory", authMiddleware, (ctx) => {
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
});

export async function getSubscribers(username: string): Promise<string[]> {
	const viewers = (await getUserViews(username)) ?? new Set();
	const subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}

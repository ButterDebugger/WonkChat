import express from "express";
import { getStream } from "./sockets.js";
import { authenticateHandler } from "./auth/session.js";
import { router as roomRoute } from "./channels/room.js";
import { getUserSession, getRoom, getUserViews } from "./lib/data.js";

export const router = express.Router();

const userSubscriptions = new Map();

router.use(roomRoute);

router.post("/users/:userid/subscribe", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { userid } = req.params;

	// Update list of subscribers
	const subscribers = userSubscriptions.get(userid) ?? new Set();
	subscribers.add(tokenPayload.username);
	userSubscriptions.set(userid, subscribers);

	res.status(200).json({
		success: true,
	});
});

router.post("/users/:userid/unsubscribe", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { userid } = req.params;

	// Update list of subscribers
	const subscribers = userSubscriptions.get(userid) ?? new Set();
	subscribers.delete(tokenPayload.username);
	userSubscriptions.set(userid, subscribers);

	res.status(200).json({
		success: true,
	});
});

router.get("/users/:username/fetch", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { username } = req.params;

	const session = await getUserSession(username);

	if (!session)
		return res.status(400).json({
			error: true,
			message: "User does not exist",
			code: 401,
		});

	res.status(200).json({
		username: session.username,
		data: {
			username: session.username,
			color: session.color,
			offline: session.offline,
		},
		success: true,
	});
});

router.get("/sync/client", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const session = await getUserSession(tokenPayload.username);
	let viewableUsers: Set<string> = new Set();

	if (!session)
		return res.status(400).json({
			error: true,
			message: "User does not exist",
			code: 401,
		});

	// Get rooms
	const rooms = [];
	for (const roomname of session.rooms) {
		const room = await getRoom(roomname);
		if (room === null) continue;

		viewableUsers = new Set([...viewableUsers, ...room.members]);

		rooms.push({
			name: room.name,
			description: room.description,
			key: room.armoredPublicKey,
			members: Array.from(room.members),
		});
	}

	// Get viewable users
	viewableUsers.delete(session.username);

	const users = await Promise.all(
		Array.from(viewableUsers).map((username) =>
			getUserSession(username).then((session) => ({
				username: session.username,
				color: session.color,
				offline: session.offline,
			})),
		),
	);

	res.status(200).json({
		rooms: rooms,
		users: users,
		you: {
			username: session.username,
			color: session.color,
			offline: session.offline,
		},
		success: true,
	});
});

router.get("/sync/memory", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const stream = getStream(tokenPayload.username);
	if (stream === null)
		return res.status(400).json({
			error: true,
			message: "Could not find an active stream",
			code: 601,
		});

	const result = stream.flushMemory();

	if (!result)
		return res.status(400).json({
			error: true,
			message: "Stream is currently inactive",
			code: 602,
		});

	res.status(200).json({
		success: true,
	});
});

export async function getSubscribers(username: string): Promise<string[]> {
	const viewers = (await getUserViews(username)) ?? new Set();
	const subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}

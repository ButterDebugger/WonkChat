import express from "express";
import { getStream } from "./sockets.js";
import { authenticateMiddleware } from "./auth/session.js";
import { router as roomRoute } from "./channels/room.js";
import { getUserSession, getRoom, getUserViews } from "./lib/data.js";

export const router = new express.Router();

let userSubscriptions = new Map();

router.use(roomRoute);

/** @deprecated */ // TODO: Remove this in favor of /users/:userid ~> /subscribe /unsubscribe /fetch
router.get("/users", authenticateMiddleware, async (req, res) => {
	let { usernames, subscribe } = req.query;

	if (typeof usernames !== "string")
		return res.status(400).json({
			error: true,
			message: "Missing query string",
			code: 102
		});

	let sessionUsernames = usernames.split(",");

	if (typeof subscribe == "string") {
		switch (subscribe) {
			case "yes":
				sessionUsernames.forEach((username) => {
					let subscribers =
						userSubscriptions.get(username) ?? new Set();
					subscribers.add(req.user.username);
					userSubscriptions.set(username, subscribers);
				});
				break;
			case "no":
				sessionUsernames.forEach((username) => {
					let subscribers =
						userSubscriptions.get(username) ?? new Set();
					subscribers.delete(req.user.username);
					userSubscriptions.set(username, subscribers);
				});
				break;
			default:
				break;
		}
	}

	let userSessions = await Promise.all(
		sessionUsernames.map((username) => {
			return getUserSession(username);
		})
	);

	let users = userSessions.reduce((arr, user) => {
		if (user !== null)
			arr.push({
				username: user.username,
				color: user.color,
				offline: user.offline
			});
		return arr;
	}, []);

	res.status(200).json({
		users: users,
		success: true
	});
});

router.post(
	"/users/:userid/subscribe",
	authenticateMiddleware,
	async (req, res) => {
		let { userid } = req.params;

		// Update list of subscribers
		let subscribers = userSubscriptions.get(userid) ?? new Set();
		subscribers.add(req.user.username);
		userSubscriptions.set(userid, subscribers);

		res.status(200).json({
			success: true
		});
	}
);

router.post(
	"/users/:userid/unsubscribe",
	authenticateMiddleware,
	async (req, res) => {
		let { userid } = req.params;

		// Update list of subscribers
		let subscribers = userSubscriptions.get(userid) ?? new Set();
		subscribers.delete(req.user.username);
		userSubscriptions.set(userid, subscribers);

		res.status(200).json({
			success: true
		});
	}
);

router.get(
	"/users/:username/fetch",
	authenticateMiddleware,
	async (req, res) => {
		let { username } = req.params;

		let session = await getUserSession(username);

		if (!session)
			return res.status(400).json({
				error: true,
				message: "User does not exist",
				code: 401
			});

		res.status(200).json({
			username: session.username,
			data: {
				username: session.username,
				color: session.color,
				offline: session.offline
			},
			success: true
		});
	}
);

router.get("/sync/client", authenticateMiddleware, async (req, res) => {
	let session = await getUserSession(req.user.username);
	let viewableUsers = new Set();

	if (!session)
		return res.status(400).json({
			error: true,
			message: "User does not exist",
			code: 401
		});

	// Get rooms
	let rooms = [];
	for (let roomname of session.rooms) {
		let room = await getRoom(roomname);

		viewableUsers = new Set([...viewableUsers, ...room.members]);

		rooms.push({
			name: room.name,
			description: room.description,
			key: room.armoredPublicKey,
			members: Array.from(room.members)
		});
	}

	// Get viewable users
	viewableUsers.delete(session.username);

	let users = await Promise.all(
		Array.from(viewableUsers).map((username) => {
			return getUserSession(username).then((session) => ({
				username: session.username,
				color: session.color,
				offline: session.offline
			}));
		})
	);

	res.status(200).json({
		rooms: rooms,
		users: users,
		you: {
			username: session.username,
			color: session.color,
			offline: session.offline
		},
		success: true
	});
});

router.get("/sync/memory", authenticateMiddleware, async (req, res) => {
	let stream = getStream(req.user.username);
	if (stream === null)
		return res.status(400).json({
			error: true,
			message: "Could not find an active stream",
			code: 601
		});

	let result = stream.flushMemory();

	if (!result)
		return res.status(400).json({
			error: true,
			message: "Stream is currently inactive",
			code: 602
		});

	res.status(200).json({
		success: true
	});
});

export async function getSubscribers(username) {
	let viewers = await getUserViews(username);
	let subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}

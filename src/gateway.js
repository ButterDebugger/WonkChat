import express from "express";
import { getStream } from "./streams.js";
import { authenticate } from "./auth.js";
import { getUserSession, createRoom, getRoom, getUserViews, addUserToRoom, removeUserFromRoom } from "./data.js";
import * as openpgp from "openpgp";

export const router = new express.Router();
const roomRegex = /[a-z0-9_]*/g;

let userSubscriptions = new Map();

router.post("/rooms/:roomname/join", authenticate, async (req, res) => {
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.username);

    if (!isValidRoomname(roomname)) return res.status(400).json({
        error: true,
        message: "Invalid room name",
        code: 301
    });

    if (userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Already joined this room",
        code: 302
    });

    let room = await getRoom(roomname);

    if (room === null) return res.status(400).json({
        error: true,
        message: "Room doesn't exist",
        code: 303
    });

    let success = await addUserToRoom(req.user.username, roomname);

    if (success === null) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    for (let username of room.members) {
        if (username === req.user.username) continue;

        let stream = getStream(username);
        if (stream === null) continue;

        stream.json({
            room: roomname,
            username: req.user.username,
            timestamp: Date.now(),
            state: "join"
        }, "updateMember");
    }

    res.status(200).json({
        name: room.name,
        description: room.description,
        key: room.armoredPublicKey,
        members: Array.from(room.members),
        success: true
    });
});

router.post("/rooms/:roomname/leave", authenticate, async (req, res) => {
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.username);

    if (!userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Cannot leave a room that you are already not in",
        code: 306
    });

    let room = await getRoom(roomname);

    if (room === null) return res.status(400).json({
        error: true,
        message: "Room doesn't exist",
        code: 303
    });

    let success = await removeUserFromRoom(req.user.username, roomname);

    if (success === null) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    for (let username of room.members) {
        if (username === req.user.username) continue;

        let stream = getStream(username);
        if (stream === null) continue;

        stream.json({
            room: roomname,
            username: req.user.username,
            timestamp: Date.now(),
            state: "leave"
        }, "updateMember");
    }

    res.status(200).json({
        success: true
    });
});

router.get("/rooms/:roomname/members", authenticate, async (req, res) => { // TODO: deprecate this in favor of /rooms/:roomname/info
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.username);

    if (!userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Cannot query info about a room that you are not in",
        code: 307
    });

    let room = await getRoom(roomname);

    if (room === null) return res.status(400).json({
        error: true,
        message: "Room doesn't exist",
        code: 303
    });

    res.status(200).json({
        members: Array.from(room.members),
        success: true
    });
});

router.post("/rooms/:roomname/create", authenticate, async (req, res) => {
    let { roomname } = req.params;

    if (!isValidRoomname(roomname)) return res.status(400).json({
        error: true,
        message: "Invalid room name",
        code: 301
    });

    let room = await createRoom(roomname);

    if (room === false) return res.status(400).json({
        error: true,
        message: "Room already exist",
        code: 305
    });
    
    res.status(200).json({
        success: true
    });
});

router.post("/rooms/:roomname/message", authenticate, async (req, res) => {
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.username);

    if (!userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Cannot send a message in a room that you are not in",
        code: 304
    });

    let room = await getRoom(roomname);

    if (room === null) return res.status(400).json({
        error: true,
        message: "Room doesn't exist",
        code: 303
    });
    
    let { message } = req.body;
    
    if (typeof message !== "string") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });
    
    let decrypted;
    try {
        let { data } = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: await openpgp.readKey({ binaryKey: room.privateKey })
        });

        if (!data.startsWith("{")) throw new TypeError("Invalid data type.");
        
        decrypted = JSON.parse(data);
    } catch (error) {
        return res.status(400).json({
            error: true,
            message: "Invalid encrypted body",
            code: 104
        });
    }

    let { content, attachments } = decrypted;

    if (typeof content !== "string" || !Array.isArray(attachments)) return res.status(400).json({
        error: true,
        message: "Invalid encrypted body",
        code: 104
    });

    if (content.length > 1000 || content.replace(/\s/g, '').length == 0) return res.status(400).json({
        error: true,
        message: "Invalid message content",
        code: 201
    });

    for (let username of room.members) {
        let stream = getStream(username);
        if (stream === null) continue;

        stream.json({
            author: {
                username: userSession.username,
                color: userSession.color,
                offline: userSession.offline
            },
            room: roomname,
            content: content,
            attachments: attachments,
            timestamp: Date.now()
        }, "message");
    }

    res.status(200).json({
        success: true
    });
});

router.get("/rooms/:roomname/info", authenticate, async (req, res) => {
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.username);

    if (!userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Cannot query info about a room that you are not in",
        code: 307
    });

    let room = await getRoom(roomname);

    if (room === null) return res.status(400).json({
        error: true,
        message: "Room doesn't exist",
        code: 303
    });

    res.status(200).json({
        name: room.name,
        description: room.description,
        key: room.armoredPublicKey,
        members: Array.from(room.members),
        success: true
    });
});

router.post("/rooms/:roomname/typing", authenticate, (req, res) => {
    let { roomname } = req.params;

    // TODO: finish this
});

router.get("/users", authenticate, async (req, res) => { // TODO: deprecate this in favor of /users/:userid ~> /subscribe /unsubscribe /fetch
    let { usernames, subscribe } = req.query;

    if (typeof usernames !== "string") return res.status(400).json({
        error: true,
        message: "Missing query string",
        code: 102
    });

    let sessionUsernames = usernames.split(",");

    if (typeof subscribe == "string") {
        switch (subscribe) {
            case "yes":
                sessionUsernames.forEach(username => {
                    let subscribers = userSubscriptions.get(username) ?? new Set();
                    subscribers.add(req.user.username);
                    userSubscriptions.set(username, subscribers);
                });
                break;
            case "no":
                sessionUsernames.forEach(username => {
                    let subscribers = userSubscriptions.get(username) ?? new Set();
                    subscribers.delete(req.user.username);
                    userSubscriptions.set(username, subscribers);
                });
                break;
            default:
                break;
        }
    }

    let userSessions = await Promise.all(sessionUsernames.map((username) => {
        return getUserSession(username);
    }));

    let users = userSessions.reduce((arr, user) => {
        if (user !== null) arr.push({
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

router.post("/users/:userid/subscribe", authenticate, async (req, res) => {
    let { userid } = req.params;
    
    // Update list of subscribers
    let subscribers = userSubscriptions.get(userid) ?? new Set();
    subscribers.add(req.user.username);
    userSubscriptions.set(userid, subscribers);

    res.status(200).json({
        success: true
    });
});

router.post("/users/:userid/unsubscribe", authenticate, async (req, res) => {
    let { userid } = req.params;
    
    // Update list of subscribers
    let subscribers = userSubscriptions.get(userid) ?? new Set();
    subscribers.delete(req.user.username);
    userSubscriptions.set(userid, subscribers);

    res.status(200).json({
        success: true
    });
});

router.get("/users/:username/fetch", authenticate, async (req, res) => {
    let { username } = req.params;

    let session = await getUserSession(username);

    if (!session) return res.status(400).json({
        error: true,
        message: "User does not exist",
        code: 401
    });

    res.status(200).json({
        username: session.username,
        data: {
            username: session.username,
            color: session.color,
            offline: session.offline,
        },
        success: true
    });
});

router.get("/sync/client", authenticate, async (req, res) => {
    let userSession = await getUserSession(req.user.username);
    let viewableUsers = new Set();

    // Get rooms
    let rooms = [];
    for (let roomname of userSession.rooms) {
        let room = await getRoom(roomname);

        viewableUsers = new Set([...viewableUsers, ...room.members]);

        rooms.push({
            name: room.name,
            description: room.description,
            key: room.armoredPublicKey,
            members: Array.from(room.members),
        });
    }

    // Get viewable users
    viewableUsers.delete(userSession.username);
    
    let users = await Promise.all(Array.from(viewableUsers).map((username) => {
        return getUserSession(username).then((session) => ({
            username: session.username,
            color: session.color,
            offline: session.offline
        }));
    }));

    res.status(200).json({
        rooms: rooms,
        users: users,
        you: {
            username: userSession.username,
            color: userSession.color,
            offline: userSession.offline
        },
        success: true
    });
});

router.get("/sync/memory", authenticate, async (req, res) => {
    let stream = getStream(req.user.username);
    if (stream === null) return res.status(400).json({
        error: true,
        message: "Could not find an active stream",
        code: 601
    });

    let result = stream.flushMemory();

    if (!result) return res.status(400).json({
        error: true,
        message: "Stream is currently inactive",
        code: 602
    });

    res.status(200).json({
        success: true
    });
});

function isValidRoomname(roomname) {
    if (typeof roomname !== "string") return false;
    if (
        roomname.length < 3 ||
        roomname.length > 16 ||
        roomname.replace(roomRegex, '').length !== 0
    ) return false;
    return true;
}

export async function getSubscribers(username) {
    let viewers = await getUserViews(username);
    let subscriptions = userSubscriptions.get(username) ?? new Set();

    return Array.from(new Set([...viewers, ...subscriptions]));
}

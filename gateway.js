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

    let userSession = await getUserSession(req.user.id);

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

    let success = await addUserToRoom(req.user.id, roomname);

    if (success === null) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    for (let id of room.members) {
        if (id === req.user.id) continue;

        let stream = getStream(id);
        if (stream === null) continue;

        stream.json({
            room: roomname,
            id: req.user.id,
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

    let userSession = await getUserSession(req.user.id);

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

    let success = await removeUserFromRoom(req.user.id, roomname);

    if (success === null) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    for (let id of room.members) {
        if (id === req.user.id) continue;

        let stream = getStream(id);
        if (stream === null) continue;

        stream.json({
            room: roomname,
            id: req.user.id,
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

    let userSession = await getUserSession(req.user.id);

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

    let userSession = await getUserSession(req.user.id);

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

    for (let id of room.members) {
        let stream = getStream(id);
        if (stream === null) continue;

        stream.json({
            author: {
                username: userSession.username,
                color: userSession.color,
                id: userSession.id,
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

    let userSession = await getUserSession(req.user.id);

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
    let { ids, subscribe } = req.query;

    if (typeof ids !== "string") return res.status(400).json({
        error: true,
        message: "Missing query string",
        code: 102
    });

    let sessionIds = ids.split(",");

    if (typeof subscribe == "string") {
        switch (subscribe) {
            case "yes":
                sessionIds.forEach(id => {
                    let subscribers = userSubscriptions.get(id) ?? new Set();
                    subscribers.add(req.user.id);
                    userSubscriptions.set(id, subscribers);
                });
                break;
            case "no":
                sessionIds.forEach(id => {
                    let subscribers = userSubscriptions.get(id) ?? new Set();
                    subscribers.delete(req.user.id);
                    userSubscriptions.set(id, subscribers);
                });
                break;
            default:
                break;
        }
    }

    let userSessions = await Promise.all(sessionIds.map((id) => {
        return getUserSession(id);
    }));

    let users = userSessions.reduce((arr, user) => {
        if (user !== null) arr.push({
            id: user.id,
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
    subscribers.add(req.user.id);
    userSubscriptions.set(userid, subscribers);

    res.status(200).json({
        success: true
    });
});

router.post("/users/:userid/unsubscribe", authenticate, async (req, res) => {
    let { userid } = req.params;
    
    // Update list of subscribers
    let subscribers = userSubscriptions.get(userid) ?? new Set();
    subscribers.delete(req.user.id);
    userSubscriptions.set(userid, subscribers);

    res.status(200).json({
        success: true
    });
});

router.get("/users/:userid/fetch", authenticate, async (req, res) => {
    let { userid } = req.params;

    let session = await getUserSession(userid);

    if (!session) return res.status(400).json({
        error: true,
        message: "User does not exist",
        code: 401
    });

    res.status(200).json({
        id: session.id,
        data: {
            id: session.id,
            username: session.username,
            color: session.color,
            offline: session.offline,
        },
        success: true
    });
});

router.get("/sync/client", authenticate, async (req, res) => {
    let userSession = await getUserSession(req.user.id);
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
    viewableUsers.delete(userSession.id);
    
    let users = await Promise.all(Array.from(viewableUsers).map((id) => {
        return getUserSession(id).then((session) => ({
            id: session.id,
            username: session.username,
            color: session.color,
            offline: session.offline
        }));
    }));

    res.status(200).json({
        rooms: rooms,
        users: users,
        you: {
            id: userSession.id,
            username: userSession.username,
            color: userSession.color,
            offline: userSession.offline
        },
        success: true
    });
});

router.get("/sync/memory", authenticate, async (req, res) => {
    let stream = getStream(req.user.id);
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

export async function getSubscribers(id) {
    let viewers = await getUserViews(id);
    let subscriptions = userSubscriptions.get(id) ?? new Set();

    return Array.from(new Set([...viewers, ...subscriptions]));
}

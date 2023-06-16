import express from "express";
import sockets, { getSocket } from "./sockets.js";
import attachments from "./attachments.js";
import { authenticate } from "./auth.js";
import { getUserSession, createRoom, getRoom } from "../storage/data.js";

const router = new express.Router();
const roomRegex = /[a-z0-9_]*/g;

let userSubscriptions = new Map();

router.post("/rooms/:roomname/join", async (req, res) => {
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

    await userSession.joinRoom(roomname);

    for (let id of room.members) {
        if (id === req.user.id) continue;

        let socket = getSocket(id);
        if (socket === null) continue;

        socket.json({
            event: "updateMember",
            room: roomname,
            id: req.user.id,
            timestamp: Date.now(), // TODO: make more accurate somehow
            state: "join"
        });
    }

    res.status(200).json({
        name: room.name,
        description: room.description
    });
});

router.post("/rooms/:roomname/leave", async (req, res) => {
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

    await userSession.leaveRoom(roomname);

    for (let id of room.members) {
        if (id === req.user.id) continue;

        let socket = getSocket(id);
        if (socket === null) continue;

        socket.json({
            event: "updateMember",
            room: roomname,
            id: req.user.id,
            timestamp: Date.now(), // TODO: make more accurate somehow
            state: "leave"
        });
    }

    res.status(200).json({
        success: true
    });
});

router.get("/rooms/:roomname/members", async (req, res) => {
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
        members: Array.from(room.members)
    });
});

router.post("/rooms/:roomname/create", async (req, res) => {
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

router.post("/rooms/:roomname/message", async (req, res) => {
    let { roomname } = req.params;
    let { content, attachments } = req.body;

    if (typeof content !== "string" || !Array.isArray(attachments)) return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });

    if (content.length > 1000 || content.replace(/\s/g, '').length == 0) return res.status(400).json({
        error: true,
        message: "Invalid message content",
        code: 201
    });

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

    for (let id of room.members) {
        let socket = getSocket(id);
        if (socket === null) continue;

        socket.json({
            event: "message",
            author: {
                username: req.user.username,
                color: req.user.color,
                discriminator: req.user.discriminator
            },
            room: roomname,
            content: content,
            attachments: attachments,
            timestamp: Date.now() // TODO: make more accurate
        })
    }

    res.status(200).json({
        success: true
    });
});

router.post("/rooms/:roomname/typing", (req, res) => {
    let { roomname } = req.params;

    // TODO: finish this
});

router.get("/users", async (req, res) => {
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
            discriminator: user.discriminator,
            color: user.color,
            offline: user.offline
        });
        return arr;
    }, []);
    
    res.status(200).json({
        users: users
    });
});

router.get("/sync/me", async (req, res) => {
    let userSession = await getUserSession(req.user.id);

    // Get rooms
    let rooms = {};
    for (let roomname of userSession.rooms) {
        let room = await getRoom(roomname);

        rooms[roomname] = {
            name: room.name,
            description: room.description
        }
    }

    res.status(200).json({
        rooms: rooms
    });
})

export default function(app, wss) {
    sockets(wss, router);
    app.use("/api", authenticate, router);

    // Create starting room
    createRoom("irc", "Welcome to ircChat!");
    
    // Handle attachments
    app.use(attachments.router); // TODO: move this under the api router
    attachments.clean();
}

function isValidRoomname(roomname) {
    if (typeof roomname !== "string") return false;
    if (
        roomname.length < 3 ||
        roomname.length > 16 ||
        roomname.replace(roomRegex, '').length !== 0
    ) return false;
    return true;
}

export function getSubscribers(id) {
    return Array.from(userSubscriptions.get(id) ?? new Set());
}

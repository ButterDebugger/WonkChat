import express from "express";
import sockets, { getSocketIds, getSocket } from "./sockets.js";
import attachments from "./attachments.js";
import { authenticate } from "./auth.js";
import { getUserSession } from "../storage/data.js";

const router = new express.Router();
const roomRegex = /[a-z0-9_]*/g;

router.post("/rooms/:roomname/join", async (req, res) => {
    let { roomname } = req.params;

    let userSession = await getUserSession(req.user.id);

    // ...
});

router.post("/rooms/:roomname/leave", (req, res) => {
    let { roomname } = req.params;

    // ...
});

router.post("/rooms/:roomname/message", async (req, res) => {
    let { roomname } = req.params;
    let { content, attachments } = req.body;

    if (typeof content !== "string" || !Array.isArray(attachments)) return res.status(400).json({
        error: true,
        message: "Invalid json body"
    });

    let userSession = await getUserSession(req.user.id);

    if (!userSession.rooms.has(roomname)) return res.status(400).json({
        error: true,
        message: "Cannot send a message in a room that you are not in"
    });

    for (let id of getSocketIds()) {
        getSocket(id).json({
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

    res.status(200).end();
});

router.post("/rooms/:roomname/typing", (req, res) => {
    let { roomname } = req.params;

    // ...
});

export default function(app, wss) {
    sockets(wss, router);
    app.use("/api", authenticate, router);
    
    // Handle attachments
    app.use(attachments.router); // TODO: move this under the api router
    attachments.clean();
}

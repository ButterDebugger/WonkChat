import express from "express";
import sockets, { getSocket } from "./sockets.js";
import attachments from "./attachments.js";
import { authenticate } from "./auth.js";
import { createUser } from "../storage/data.js";

const router = new express.Router();
const roomRegex = /[a-z0-9_]*/g;

router.post("/rooms/:roomid/join", (req, res) => {
    let { roomid } = req.params;

    // ...
});

router.post("/rooms/:roomid/leave", (req, res) => {
    let { roomid } = req.params;

    // ...
});

router.post("/rooms/:roomid/message", (req, res) => {
    let { roomid } = req.params;

    // ...
});

router.post("/rooms/:roomid/typing", (req, res) => {
    let { roomid } = req.params;

    // ...
});

export default function(app, wss) {
    sockets(wss, router);
    app.use("/api", authenticate, router);
    
    // Handle attachments
    app.use(attachments.router); // TODO: move this under the api router
    attachments.clean();
}

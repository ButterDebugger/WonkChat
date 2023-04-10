import express from "express";
import sockets from "./sockets.js";
import attachments from "./attachments.js";
import { authenticate } from "./auth.js";

const router = new express.Router();

router.post("/rooms/:roomid/join", (req, res) => {
    
});

router.post("/rooms/:roomid/leave", (req, res) => {
    
});

router.post("/rooms/:roomid/message", (req, res) => {

});

router.post("/rooms/:roomid/typing", (req, res) => {

});

export default function(app, wss) {
    sockets(wss, router);
    app.use("/api", authenticate, router);
    
    // Handle attachments
    app.use(attachments.router); // TODO: move this under the api router
    attachments.clean();
}

import { WebSocket } from "ws";
import { getUserSession } from "../storage/data.js";
import { getSubscribers } from "./gateway.js";

let wss, router;
let clientSockets = new Map();

function generateId() {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let id = "";
	while (id.length < 20) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}

function initRouter(router) {
    router.post("/receiver", (req, res) => {
        let { session } = req.body;

        for (let socket of wss.clients) {
            if (socket.id == session && socket.isOpen()) {
                socket.session = req.user.id;
                clientSockets.set(req.user.id, socket);
                
                setSessionStatus(socket.session, false);
                socket.json({
                    event: "link",
                    success: true,
                    session: socket.session
                });
                res.json({
                    success: true
                });
                return;
            }
        }
        
        res.status(400).json({
            error: true,
            message: "Failed to link receiver",
            code: 601
        });
    });
}

function initWebsocket(wss) {
    wss.on("connection", (socket) => {
        socket.id = generateId();
        socket.session = null;
        socket.alive = true;
        socket.isOpen = function() {
            return socket?.readyState === 1;
        }
        socket.json = function(data) {
            socket.send(JSON.stringify(data));
        }

        ping(socket);

        socket.on("message", async (message) => {
            let data;
            try {
                message = message.toString();
                if (!message.startsWith("{") || !message.endsWith("}")) return;
                data = JSON.parse(message);
            } catch (error) { return; }

            if (data?.event === "pong") {
                socket.alive = true;
                setSessionStatus(socket?.session, false);
            }
        });

        socket.on("close", () => {
            setSessionStatus(socket?.session, true);
            delete clientSockets.delete(socket?.session);
        });
    });

    function ping(socket) {
        socket.ping();
        socket.json({
            event: "ping",
            id: socket.id,
            session: socket.session
        });
    }

    setInterval(() => {
        wss.clients.forEach((socket) => {
            if (socket.alive === false) {
                setSessionStatus(socket?.session, true);
                socket.terminate();
                return;
            }
        
            socket.alive = false;
            ping(socket);
        });
    }, 30_000);
}

export async function setSessionStatus(id, offline) {
    let userSession = await getUserSession(id);
    if (userSession !== null) {
        let changed = userSession.offline !== offline;

        userSession.offline = offline;

        if (changed) {
            getSubscribers(id).forEach(subscriber => {
                let socket = clientSockets.get(subscriber) ?? null;

                if (socket !== null) {
                    socket.json({
                        event: "updateUser",
                        id: id,
                        data: {
                            id: userSession.id,
                            username: userSession.username,
                            discriminator: userSession.discriminator,
                            color: userSession.color,
                            offline: userSession.offline
                        }
                    });
                }
            })
        }
    }
}

export function getSocketIds() {
    return Array.from(clientSockets.keys());
}

export function getSocket(id) {
    let socket = clientSockets.get(id);
    if (!(socket instanceof WebSocket)) return null;
    if (socket?.isOpen() === false) return null;
    return socket;
}

export default function(websocketServer, gatewayRouter) {
    wss = websocketServer;
    router = gatewayRouter;

    initWebsocket(wss);
    initRouter(router);
}

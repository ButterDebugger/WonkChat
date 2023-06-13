import { WebSocket } from "ws";

let wss, router;
let clientSockets = {};

function generateId() {
	let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
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
                clientSockets[req.user.id] = socket;
                
                socket.json({
                    event: "link",
                    success: true,
                    session: session
                });
                res.json({
                    success: true
                });
                return;
            }
        }
        
        res.status(400).json({
            error: true,
            message: "Failed to link receiver"
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

        socket.on("message", (message) => {
            let data;
            try {
                message = message.toString();
                if (!message.startsWith("{") || !message.endsWith("}")) return;
                data = JSON.parse(message);
            } catch (error) { return; }

            if (data?.event === "pong") {
                socket.alive = true;
            }
        });

        socket.on("close", () => {
            delete clientSockets[socket.session];
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
            if (socket.alive === false) return socket.terminate();
        
            socket.alive = false;
            ping(socket);
        });
    }, 30_000);
}

export function getSocketIds() {
    return Object.keys(clientSockets);
}

export function getSocket(id) {
    let socket = clientSockets[id];
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

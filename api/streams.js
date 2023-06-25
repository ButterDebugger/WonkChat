import { getUserSession } from "../storage/data.js";
import { getSubscribers } from "./gateway.js";

let clientStreams = new Map();

class Stream {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.pings = 0;
        this.pingInterval = null;
        this.memory = [];
    }

    send(data, event = "unknown") {
        let message = `event:${event}\ndata:${data}\n\n`;

        if (this.isAlive()) {
            this.res.write(message);
        } else {
            this.memory.push(message);
        }
    }
    json(data, event) {
        this.send(JSON.stringify(data), event);
    }
    initPings() {
        if (this.pings !== 0) return;

        if (this.pingInterval !== null) clearInterval(this.pingInterval);

        this.pingInterval = setInterval(() => {
            if (!this.isAlive()) {
                clearInterval(this.pingInterval);
                return;
            }

            this.json({
                ping: this.pings++
            }, "ping");
        }, 40_000);
    }
    isAlive() {
        return !this.res.finished;
    }
    getSession() {
        return this.req.user;
    }
    flushMemory() {
        if (!this.isAlive()) return false;

        this.memory.forEach(msg => {
            this.res.write(msg);
        });
        this.memory = [];
        return true;
    }
    reassign(req, res) {
        this.res.end();
        
        this.req = req;
        this.res = res;
    }
}

function initRouter(router) {
    router.get("/stream", (req, res) => {
        res.writeHead(200, {
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
        });
        res.flushHeaders();

        let stream;
        if (clientStreams.has(req.user.id)) {
            stream = clientStreams.get(req.user.id);
            stream.reassign(req, res);
        } else {
            stream = new Stream(req, res);
            clientStreams.set(req.user.id, stream);
        }
        
        stream.json({
            opened: true
        }, "connect");
        
        setOnlineStatus(req.user.id, true);
        
        res.on("close", () => {
            setOnlineStatus(req.user.id, false);
            res.end();
        });

        stream.initPings();
    });
}

export async function setOnlineStatus(id, online) {
    let userSession = await getUserSession(id);
    if (userSession !== null) {
        let changed = userSession.offline !== !online;

        userSession.offline = !online;

        if (changed) {
            getSubscribers(id).forEach(subscriber => {
                let stream = getStream(subscriber);

                if (stream !== null) {
                    stream.json({
                        id: id,
                        data: {
                            id: userSession.id,
                            username: userSession.username,
                            discriminator: userSession.discriminator,
                            color: userSession.color,
                            offline: userSession.offline
                        }
                    }, "updateUser");
                }
            })
        }
    }
}

export function getStream(id) {
    let stream = clientStreams.get(id);
    if (!(stream instanceof Stream)) return null;
    // if (!stream.isAlive()) return null;
    return stream;
}

export default function(gatewayRouter) {
    initRouter(gatewayRouter);
}

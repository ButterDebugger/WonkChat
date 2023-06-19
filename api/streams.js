import { getUserSession } from "../storage/data.js";
import { getSubscribers } from "./gateway.js";

let clientStreams = new Map();

class Stream {
    constructor(req, res) {
        this.req = req;
        this.res = res;
    }

    json(data) {
        this.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    isAlive() {
        return !this.res.finished;
    }
    getSession() {
        return this.req.user;
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

        let stream = new Stream(req, res);
        
        stream.json({
            opened: true
        });
        
        setOnlineStatus(req.user.id, true);
        clientStreams.set(req.user.id, stream);
        
        res.on("close", () => {
            setOnlineStatus(req.user.id, false);
            clientStreams.delete(req.user.id);
            res.end();
        });
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

export function getStream(id) {
    let stream = clientStreams.get(id);
    if (!(stream instanceof Stream)) return null;
    if (!stream.isAlive()) return null;
    return stream;
}

export default function(gatewayRouter) {
    initRouter(gatewayRouter);
}

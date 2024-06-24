import { getUserPublicKey, getUserSession, setUserStatus } from "./data.js";
import { getSubscribers } from "./gateway.js";
import * as openpgp from "openpgp";

let clientStreams = new Map();

class Stream {
    constructor(req, res) {
        this.clients = [];
        this.session = null;
        this.remix(req, res);
        this.pings = 0;
        this.pingInterval = null;
        this.memory = [];
    }

    async send(data, event = "unknown") {
        let key = await getUserPublicKey(this.session.username);
        let encrypted = await openpgp.encrypt({ // TODO: make binary
            message: await openpgp.createMessage({ text: data }),
            encryptionKeys: await openpgp.readKey({ binaryKey: key })
        });
        let message = `event:${event}\ndata:${JSON.stringify(encrypted)}\n\n`;

        if (this.isAlive()) {
            for (let client of this.clients) {
                client.res.write(message);
            }
        } else {
            this.memory.push(message);
        }
    }
    async json(data, event) {
        await this.send(JSON.stringify(data), event);
    }
    initPings() {
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
        for (let client of this.clients) {
            if (!client.res.finished) return true;
        }
        return false;
    }
    flushMemory() {
        if (!this.isAlive()) return false;

        this.memory.forEach(msg => {
            for (let client of this.clients) {
                client.res.write(msg);
            }
        });
        this.memory = [];
        return true;
    }
    remix(req, res) {
        this.clients.push({
            req: req,
            res: res
        });
        this.session = req.user;

        setOnlineStatus(this.session.username, true);
        
        res.on("close", () => {
            res.end();
            setOnlineStatus(this.session.username, this.isAlive());
            this.clients = this.clients.filter(client => !client.res.finished);
        });
    }
}

export function getStreamRoute(req, res) {
    res.writeHead(200, {
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
    });
    res.flushHeaders();

    let stream;
    if (clientStreams.has(req.user.username)) {
        stream = clientStreams.get(req.user.username);
        stream.remix(req, res);
    } else {
        stream = new Stream(req, res);
        clientStreams.set(req.user.username, stream);
    }
    
    stream.json({
        opened: true
    }, "connect");

    stream.initPings();
}

async function setOnlineStatus(username, online) {
    let userSession = await getUserSession(username);
    if (userSession !== null) {
        let changed = userSession.offline !== !online;

        await setUserStatus(username, online);

        if (changed) {
            await updateUserSubscribers(username, userSession);
        }
    }
}

export async function updateUserSubscribers(username, userSession) {
    let viewers = await getSubscribers(username);
    
    viewers.forEach(subscriber => {
        let stream = getStream(subscriber);

        if (stream !== null) {
            stream.json({
                username: userSession.username,
                data: {
                    username: userSession.username,
                    color: userSession.color,
                    offline: userSession.offline
                },
                timestamp: Date.now()
            }, "updateUser");
        }
    })
}

export function getStream(username) {
    let stream = clientStreams.get(username);
    if (!(stream instanceof Stream)) return null;
    return stream;
}

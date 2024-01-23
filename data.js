import fs from "node:fs";
import path from "node:path";
import * as openpgp from "openpgp";
import Database from "better-sqlite3";

// Create storage directory
if (!fs.existsSync(path.join(process.cwd(), "storage"))) {
    fs.mkdirSync(path.join(process.cwd(), "storage"));
}

// Setup database
const db = new Database("storage/data.sqlite");

// TODO: Finish database initialization
db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, color TEXT, rooms TEXT ARRAY, online BOOLEAN, publicKey BLOB)");
db.exec("CREATE TABLE IF NOT EXISTS rooms (name TEXT PRIMARY KEY, description TEXT, members INTEGER ARRAY, publicKey BLOB, privateKey BLOB)");

// Data structures:
let sessions = new Map();
let rooms = new Map();

class User {
    constructor(id) {
        this.id = id;
        this.username = null;
        this.color = null;
        this.rooms = new Set();
        this.offline = true;
        this.publicKey = null;
    }

    async joinRoom(roomname) {
        let room = await getRoom(roomname);
        room.members.add(this.id);
        
        this.rooms.add(roomname);
    }
    async leaveRoom(roomname) {
        let room = await getRoom(roomname);
        room.members.delete(this.id);
        
        this.rooms.delete(roomname);
    }

    get online() {
        return !this.offline;
    }

    set online(value) {
        this.offline = !value;
    }
}

class Room {
    constructor(name, description = "") {
        this.name = name;
        this.description = description;
        this.members = new Set();
        this.messages = [];

        this.publicKey = null;
        this.privateKey = null;
    }

    setKeyPair(publicKey = null, privateKey = null) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }
}

class Message {
    constructor(user, content, timestamp = Date.now(), attachments = []) {
        this.user = user;
        this.content = content;
        this.attachments = attachments;
        this.timestamp = timestamp;
    }
}

class Attachment {
    constructor(filename, data, user = null) {
        this.filename = filename;
        this.data = data;
        this.user = user;
    }
}

// Interface functions:
export async function createUserSession(userId, username, color) {
    if (sessions.has(userId)) return sessions.get(userId);

    let user = new User(userId);
    user.username = username;
    user.color = color;
    sessions.set(userId, user);
    return user;
}

export async function getUserSession(userId) {
    if (!sessions.has(userId)) return null;

    return sessions.get(userId);
}

export async function getUserViews(userId) {
    if (!sessions.has(userId)) return new Set();

    let viewers = [];
    let user = sessions.get(userId);

    for (let roomName of user.rooms) {
        if (!rooms.has(roomName)) continue;
    
        let room = rooms.get(roomName);
        viewers = viewers.concat(...room.members);
    }

    return new Set(viewers);
}

export async function updateUserSession(userId, extra = {}) {
    if (!sessions.has(userId)) return false;

    let user = sessions.get(userId);

    for (let key in extra) {
        user[key] = extra[key];
    }

    sessions.set(userId, user);
    return true;
}

export async function createRoom(roomname, description = null) {
    if (rooms.has(roomname)) return false;

    let room = new Room(roomname, description);
    let { publicKey, privateKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 2048,
        userIDs: [{
            name: roomname
        }]
    });
    room.setKeyPair(publicKey, privateKey);
    rooms.set(roomname, room);
    return room;
}

export async function getRoom(roomname) {
    if (!rooms.has(roomname)) return null;

    return rooms.get(roomname);
}

export async function setPublicKey(userId, publicKey) {
    if (!sessions.has(userId)) return false;

    let user = sessions.get(userId);
    user.publicKey = publicKey;
    sessions.set(userId, user);
    return true;
}

export async function getPublicKey(userId) {
    if (!sessions.has(userId)) return null;

    return sessions.get(userId).publicKey;
}

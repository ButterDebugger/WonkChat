import db from "./database.js";

let sessions = new Map();
let rooms = new Map();

class User {
    constructor(id) {
        this.id = id;
        this.rooms = new Set();
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
}

class Room {
    constructor(name, description = "") {
        this.name = name;
        this.description = description;
        this.members = new Set();
        this.messages = [];
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

// TODO: add optional database handing into functions

export async function createUserSession(id, extra = {}) {
    if (sessions.has(id)) return;

    let user = new User(id);

    for (let key in extra) {
        user[key] = extra[key];
    }

    sessions.set(id, user);
}

export async function getUserSession(id) {
    if (!sessions.has(id)) return null;

    return sessions.get(id);
}

export async function createRoom(roomname, description = null) {
    if (rooms.has(roomname)) return false;

    let room = new Room(roomname, description);
    rooms.set(roomname, room);
    return room;
}

export async function getRoom(roomname) {
    if (!rooms.has(roomname)) return null;

    return rooms.get(roomname);
}
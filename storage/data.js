import db from "./database.js";

let sessions = new Map();
let users = [];
let rooms = [];
let messages = [];
let attachments = [];

class User {
    constructor(id) {
        this.id = id;
        this.rooms = new Set();
    }

    joinRoom(roomname) {}
    leaveRoom(roomname) {}
}

class Room {
    constructor(name) {
        this.name = name;
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

export async function createUserSession(id) {
    if (sessions.has(id)) return;

    sessions.set(id, new User(id));
}

export async function getUserSession(id) {
    if (!sessions.has(id)) return null;

    return sessions.get(id);
}

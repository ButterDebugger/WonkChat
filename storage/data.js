import db from "./database.js";

let sessions = new Map();
let users = [];
let rooms = new Map();
let messages = [];
let attachments = [];

class User {
    constructor(id) {
        this.id = id;
        this.rooms = new Set();
    }

    joinRoom(roomname) {
        this.rooms.add(roomname);
    }
    leaveRoom(roomname) {
        this.rooms.delete(roomname);
    }
}

class Room {
    constructor(name, description = "") {
        this.name = name;
        this.description = description;
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

export async function createRoom(roomname, options = {}) {
    if (rooms.has(roomname)) return false;

    let room = new Room(roomname);
    rooms.set(roomname, room);
    return room;
}

export async function getRoom(roomname) {
    if (!rooms.has(roomname)) return null;

    return rooms.get(roomname);
}
import * as openpgp from "openpgp";

let sessions = new Map();
let rooms = new Map();
let publicKeys = new Map();

class User {
    constructor(id) {
        this.id = id;
        this.rooms = new Set();
        this.offline = true;
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

// TODO: add optional database handing into functions

export async function createUserSession(id, extra = {}) {
    if (sessions.has(id)) return sessions.get(id);

    let user = new User(id);

    for (let key in extra) {
        user[key] = extra[key];
    }

    sessions.set(id, user);
    return user;
}

export async function getUserSession(id) {
    if (!sessions.has(id)) return null;

    return sessions.get(id);
}

export async function getUserViews(id) {
    if (!sessions.has(id)) return new Set();

    let viewers = [];
    let user = sessions.get(id);

    for (let roomName of user.rooms) {
        if (!rooms.has(roomName)) continue;
    
        let room = rooms.get(roomName);
        viewers = viewers.concat(...room.members);
    }

    return new Set(viewers);
}

export async function updateUserSession(id, extra = {}) {
    if (!sessions.has(id)) return false;

    let user = sessions.get(id);

    for (let key in extra) {
        user[key] = extra[key];
    }

    sessions.set(id, user);
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

export async function setPublicKey(fingerprint, publicKey) {
    publicKeys.set(fingerprint, publicKey);
}

export async function getPublicKey(fingerprint) {
    if (!publicKeys.has(fingerprint)) return null;

    return publicKeys.get(fingerprint);
}

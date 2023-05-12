import db from "./database.js";

let users = [];
let rooms = [];
let messages = [];
let attachments = [];

class User {
    constructor(id) {
        this.id = id;
        this.rooms = [];
    }
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

export async function createUser() {
    
}

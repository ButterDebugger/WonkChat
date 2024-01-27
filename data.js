import fs from "node:fs";
import path from "node:path";
import * as openpgp from "openpgp";
import knex from "knex";

// Create storage directory
if (!fs.existsSync(path.join(process.cwd(), "storage"))) {
    fs.mkdirSync(path.join(process.cwd(), "storage"));
}

// Setup database client
const db = knex({
    client: "better-sqlite3", // TODO: add different client type configurations
    connection: {
        filename: path.join(process.cwd(), "storage", "data.sqlite")
    },
    useNullAsDefault: true
});

// Initialize database tables
await Promise.all([
	db.schema.hasTable("users").then((exists) => {
		if (!exists) {
			return db.schema.createTable("users", (table) => {
				table.text("id").primary(); // TODO: use usernames instead for ids
				table.text("username");
				table.text("color");
                table.text("rooms").defaultTo("[]"); // TODO: Use a different data type that sql supports
				table.boolean("online").defaultTo(false);
				table.binary("publicKey");
			});
		}
	}),
	db.schema.hasTable("rooms").then((exists) => {
		if (!exists) {
			return db.schema.createTable("rooms", (table) => {
				table.text("name").primary();
				table.text("description").defaultTo("");
				table.text("members").defaultTo("[]"); // TODO: Use a different data type that sql supports
				table.binary("publicKey");
				table.binary("privateKey");
			});
		}
	})
]);

// Interface functions:
export async function getUserSession(userId) {
    return await db("users")
        .where("id", userId)
        .first()
        .then((user) => {
            if (!user) return null;
            
            user.online = !!user.online; // Convert to boolean
            user.offline = !user.online; // NOTE: Legacy key name
            user.rooms = new Set(JSON.parse(user.rooms)); // Convert to set
            return user;
        })
        .catch(() => null);
}

export async function updateUserProfile(userId, username, color) {
    return await db("users")
        .insert({
            id: userId,
            username: username,
            color: color
        })
        .onConflict("id")
        .merge()
        .then(() => getUserSession(userId))
        .catch(() => null);
}

export async function setUserStatus(userId, online) {
    return await db("users")
        .where("id", userId)
        .update({
            online: online
        })
        .then(() => true)
        .catch(() => false);
}

export async function addUserToRoom(userId, roomname) {
    let user = await getUserSession(userId);
    if (user === null) return false;

    let room = await getRoom(roomname);
    if (room === null) return false;

    user.rooms.add(roomname);
    room.members.add(userId);

    return await db.transaction(async (trx) => { // TODO: test this
        await trx("users")
            .where("id", userId)
            .update({
                rooms: JSON.stringify(Array.from(user.rooms))
            });
        
        await trx("rooms")
            .where("name", roomname)
            .update({
                members: JSON.stringify(Array.from(room.members))
            });
    })
    .then(() => true)
    .catch(() => false);
}
export async function removeUserFromRoom(userId, roomname) {
    let user = await getUserSession(userId);
    if (user === null) return false;

    let room = await getRoom(roomname);
    if (room === null) return false;

    user.rooms.delete(roomname);
    room.members.delete(userId);

    return await db.transaction(async (trx) => { // TODO: test this
        await trx("users")
            .where("id", userId)
            .update({
                rooms: JSON.stringify(Array.from(user.rooms))
            });
        
        await trx("rooms")
            .where("name", roomname)
            .update({
                members: JSON.stringify(Array.from(room.members))
            });
    })
    .then(() => true)
    .catch(() => false);
}

export async function getUserViews(userId) {
    let user = await getUserSession(userId);
    if (user === null) return false;

    let viewers = new Set();

    for (let roomname of user.rooms) {
        let room = await getRoom(roomname);
        if (room === null) continue;

        room.members.forEach(viewer => viewers.add(viewer));
    }

    return viewers;
}

export async function existsRoom(roomname) {
    return await db("rooms")
        .where("name", roomname.toLowerCase())
        .first()
        .then((room) => !!room)
        .catch(() => true) // Assume the room exists if an error occurs
}

export async function createRoom(roomname, description = null) {
    if (await existsRoom(roomname)) return false;

    let { publicKey, privateKey } = await openpgp.generateKey({
        type: "rsa",
        rsaBits: 2048,
        userIDs: [{
            name: roomname
        }],
        format: "binary"
    });

    return await db("rooms")
        .insert({
            name: roomname.toLowerCase(),
            description: description,
            publicKey: publicKey,
            privateKey: privateKey
        })
        .onConflict("name")
        .merge()
        .then(() => true)
        .catch(() => false);
}

export async function getRoom(roomname) {
    return await db("rooms")
        .where("name", roomname.toLowerCase())
        .first()
        .then(async (room) => {
            if (!room) return null;
            
            room.members = new Set(JSON.parse(room.members)); // Convert to set
            room.armoredPublicKey = await openpgp.readKey({ // Convert the public key to armored format NOTE: only here for legacy reasons
                binaryKey: room.publicKey
            }).then((key) => key.armor());
            return room;
        })
        .catch(() => null);
}

export async function setUserPublicKey(userId, publicKey) {
    return await db("users")
        .where("id", userId)
        .update({
            publicKey: publicKey // TODO: make sure public key is a blob
        })
        .then(() => true)
        .catch(() => false);
}

export async function getUserPublicKey(userId) {
    return await db("users")
        .where("id", userId)
        .select("publicKey")
        .first()
        .then((key) => {
            if (!key || !key.publicKey) return null;

            return key.publicKey;
        })
        .catch(() => null);
}

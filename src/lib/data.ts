import * as openpgp from "openpgp";
import { hash, verify } from "bcrypt";
import type { Room, UserSession } from "../types.ts";
import { db } from "./database.ts";

// Create tables
await db.introspection.getTables().then(async (tables) => {
	const tableNames = tables.map((table) => table.name);

	if (!tableNames.includes("users")) {
		// Users table doesn't exist, so create it
		console.log("Creating users table");

		await db.schema
			.createTable("users")
			.addColumn("username", "text", (col) => col.primaryKey())
			.addColumn("displayName", "text", (col) => col.notNull())
			.addColumn("password", "text", (col) => col.notNull())
			.addColumn("color", "text", (col) => col.notNull())
			.addColumn("rooms", "jsonb", (col) => col.notNull())
			.addColumn("online", "boolean", (col) => col.notNull())
			.addColumn("publicKey", "blob")
			.execute();

		console.log("Created users table");
	}

	if (!tableNames.includes("rooms")) {
		// Rooms table doesn't exist, so create it
		console.log("Creating rooms table");

		await db.schema
			.createTable("rooms")
			.addColumn("name", "text", (col) => col.primaryKey())
			.addColumn("description", "text", (col) => col.notNull())
			.addColumn("members", "jsonb", (col) => col.notNull())
			.addColumn("publicKey", "blob", (col) => col.notNull())
			.addColumn("privateKey", "blob", (col) => col.notNull())
			.execute();

		console.log("Created rooms table");
	}
});

// Interface functions:
export async function getUserSession(
	username: string
): Promise<UserSession | null> {
	return await db
		.selectFrom("users")
		.selectAll()
		.where("username", "=", username)
		.executeTakeFirst()
		.then((user) => {
			if (!user) return null;

			return {
				username: user.username,
				color: user.color,
				offline: !user.online, // NOTE: Legacy key name
				online: !!user.online, // Convert to boolean
				rooms: new Set(user.rooms) // Convert to set
			} as UserSession;
		})
		.catch((err) => {
			console.error("Failed to fetch user", err);
			return null;
		});
}

export async function createUserProfile(
	username: string,
	password: string,
	color: string
): Promise<boolean | null> {
	return await db
		.selectFrom("users")
		.selectAll()
		.where("username", "=", username)
		.executeTakeFirst()
		.then(async (user) => {
			// Check if user already exists
			if (user) return false;

			return db
				.insertInto("users")
				.values({
					username: username,
					password: await hash(password), // NOTE: did have cost of 10
					color: color,
					online: false,
					rooms: "[]", // TODO: test this
					displayName: username
				})
				.executeTakeFirst()
				.then(() => true)
				.catch((err) => {
					console.error("Failed to create user", err);
					return null;
				});
		})
		.catch((err) => {
			console.error("Failed to check if user exists", err);
			return null;
		});
}

export async function compareUserProfile(username: string, password: string) {
	return await db
		.selectFrom("users")
		.select("password")
		.where("username", "=", username)
		.executeTakeFirst()
		.then(async (user) => {
			if (!user) return false;

			return await verify(password, user.password);
		})
		.catch((err) => {
			console.error("Failed to fetch users credentials", err);
			return false;
		});
}

export async function updateUserProfile(username: string, color: string) {
	return await db
		.updateTable("users")
		.where("username", "=", username)
		.set({
			username: username,
			color: color
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to update users username and color", err);
			return false;
		});
}

export async function setUserStatus(username: string, online: boolean) {
	return await db
		.updateTable("users")
		.where("username", "=", username)
		.set({
			online: online
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to update users status", err);
			return false;
		});
}

export async function addUserToRoom(username: string, roomname: string) {
	const user = await getUserSession(username);
	if (user === null) return false;

	const room = await getRoom(roomname);
	if (room === null) return false;

	user.rooms.add(roomname);
	room.members.add(username);

	return await db
		.transaction()
		.execute(async (trx) => {
			// TODO: test this
			await trx
				.updateTable("users")
				.where("username", "=", username)
				.set({
					rooms: JSON.stringify(Array.from(user.rooms))
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("name", "=", roomname)
				.set({
					members: JSON.stringify(Array.from(room.members))
				})
				.executeTakeFirst();
		})
		.then(() => true)
		.catch((err) => {
			console.error("Failed to add user to room", err);
			return false;
		});
}
export async function removeUserFromRoom(username: string, roomname: string) {
	const user = await getUserSession(username);
	if (user === null) return false;

	const room = await getRoom(roomname);
	if (room === null) return false;

	user.rooms.delete(roomname);
	room.members.delete(username);

	return await db
		.transaction()
		.execute(async (trx) => {
			// TODO: test this
			await trx
				.updateTable("users")
				.where("username", "=", username)
				.set({
					rooms: JSON.stringify(Array.from(user.rooms))
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("name", "=", roomname)
				.set({
					members: JSON.stringify(Array.from(room.members))
				})
				.executeTakeFirst();
		})
		.then(() => true)
		.catch((err) => {
			console.error("Failed to remove user from room", err);
			return false;
		});
}

export async function getUserViews(
	username: string
): Promise<Set<string> | null> {
	const user = await getUserSession(username);
	if (user === null) return null;

	const viewers: Set<string> = new Set();

	for (const roomname of user.rooms) {
		const room = await getRoom(roomname);
		if (room === null) continue;

		for (const viewer of room.members) viewers.add(viewer);
	}

	return viewers;
}

export async function existsRoom(roomname: string) {
	return await db
		.selectFrom("rooms")
		.where("name", "=", roomname.toLowerCase())
		.executeTakeFirst()
		.then((room) => !!room)
		.catch(() => true); // Assume the room exists if an error occurs
}

export async function createRoom(
	roomname: string,
	description = "No description provided"
) {
	if (await existsRoom(roomname)) return false;

	const { publicKey, privateKey } = await openpgp.generateKey({
		type: "curve25519",
		userIDs: [
			{
				name: roomname
			}
		],
		format: "binary"
	});

	// Convert Uint8Array keys to ArrayBuffer
	const publicKeyBuffer = new ArrayBuffer(publicKey.length);
	new Uint8Array(publicKeyBuffer).set(publicKey);

	const privateKeyBuffer = new ArrayBuffer(privateKey.length);
	new Uint8Array(privateKeyBuffer).set(privateKey);

	// Insert room
	return await db
		.insertInto("rooms")
		.values({
			name: roomname.toLowerCase(),
			description: description,
			members: "[]", // TODO: test this
			publicKey: publicKeyBuffer,
			privateKey: privateKeyBuffer
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to create room", err);
			return false;
		});
}

export async function getRoom(roomname: string): Promise<Room | null> {
	return await db
		.selectFrom("rooms")
		.selectAll()
		.where("name", "=", roomname.toLowerCase())
		.executeTakeFirst()
		.then((room) => {
			if (!room) return null;

			return {
				name: room.name,
				description: room.description,
				members: new Set(room.members), // Convert to set
				privateKey: new Uint8Array(room.privateKey),
				publicKey: new Uint8Array(room.publicKey)
			} as Room;
		})
		.catch((err) => {
			console.error("Failed to fetch room", err);
			return null;
		});
}

export async function setUserPublicKey(
	username: string,
	publicKey: Uint8Array
) {
	// Convert Uint8Array to ArrayBuffer
	const buffer = new ArrayBuffer(publicKey.length);
	new Uint8Array(buffer).set(publicKey);

	// Update users table
	return await db
		.updateTable("users")
		.where("username", "=", username)
		.set({
			publicKey: buffer
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to update users public key", err);
			return false;
		});
}

export async function getUserPublicKey(
	username: string
): Promise<Uint8Array | null> {
	return await db
		.selectFrom("users")
		.where("username", "=", username)
		.select("publicKey")
		.executeTakeFirst()
		.then((user) => {
			if (!user || !user.publicKey) return null;

			return new Uint8Array(user.publicKey);
		})
		.catch((err) => {
			console.error("Failed to fetch users public key", err);
			return null;
		});
}

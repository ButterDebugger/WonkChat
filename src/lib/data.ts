import * as openpgp from "openpgp";
import bcrypt from "bcrypt";
import { createClient } from "@libsql/client";
import type { User, Room, UserRow, RoomRow } from "../types.js";

export const turso = createClient({
	url: process.env.DATABASE_URL ?? "file:local.db",
	syncUrl: process.env.DATABASE_SYNC_URL,
	authToken: process.env.DATABASE_AUTH_TOKEN,
	syncInterval: 60 // Sync every minute
});

export async function initTables() {
	// Create tables if they do not already exist
	await turso.batch(
		[
			// Users table
			"CREATE TABLE IF NOT EXISTS users (" +
				"username TEXT PRIMARY KEY, " +
				"displayName TEXT, " +
				"password TEXT, " +
				"color TEXT, " +
				"rooms TEXT DEFAULT '[]', " +
				"online BOOLEAN, " +
				"publicKey BLOB" +
				")",
			// Rooms table
			"CREATE TABLE IF NOT EXISTS rooms (" +
				"name TEXT PRIMARY KEY, " +
				"description TEXT DEFAULT '', " +
				"members TEXT DEFAULT '[]', " +
				"publicKey BLOB, " +
				"privateKey BLOB" +
				")"
		],
		"write"
	);
}

// Interface functions:
export async function getUserSession(username: string): Promise<User | null> {
	const result = await turso.execute({
		sql: "SELECT * FROM users WHERE username = ? LIMIT 1",
		args: [username]
	});

	const row = result.rows[0];
	if (!row) return null;

	const user = row as unknown as UserRow; // Cast row to a user

	return {
		username: user.username,
		displayName: user.displayName,
		password: user.password,
		color: user.color,
		rooms: new Set(JSON.parse(user.rooms)), // Convert to set
		offline: !user.online, // NOTE: Legacy key name
		online: !!user.online, // Convert to boolean
		publicKey: user.publicKey
	} as User;
}

export async function createUserProfile(
	username: string,
	password: string,
	color: string
) {
	const result = await turso.execute({
		sql: "SELECT * FROM users WHERE username = ? LIMIT 1",
		args: [username]
	});

	if (result.rows.length > 0) return false;

	try {
		await turso.execute({
			sql: "INSERT INTO users (username, password, color) VALUES (?, ?, ?)",
			args: [username, await bcrypt.hash(password, 10), color]
		});
		return true;
	} catch {
		return null;
	}
}

export async function compareUserProfile(
	username: string,
	password: string
): Promise<boolean> {
	const result = await turso.execute({
		sql: "SELECT password FROM users WHERE username = ? LIMIT 1",
		args: [username]
	});

	const row = result.rows[0];
	if (!row) return false;

	// Cast row to a user
	const user = row as unknown as UserRow;

	return await bcrypt.compare(password, user.password);
}

export async function updateUserProfile(
	username: string,
	color: string
): Promise<boolean> {
	try {
		await turso.execute({
			sql: "UPDATE users SET color = ? WHERE username = ?",
			args: [color, username]
		});
		return true;
	} catch {
		return false;
	}
}

export async function setUserStatus(username: string, online: boolean) {
	try {
		await turso.execute({
			sql: "UPDATE users SET online = ? WHERE username = ?", // NOTE: is this efficient?
			args: [online, username]
		});
		return true;
	} catch {
		return false;
	}
}

export async function addUserToRoom(
	username: string,
	roomname: string
): Promise<boolean> {
	const user = await getUserSession(username);
	if (user === null) return false;

	const room = await getRoom(roomname);
	if (room === null) return false;

	const trx = await turso.transaction("write");
	try {
		await trx.execute({
			sql: "UPDATE users SET rooms = ? WHERE username = ?",
			args: [
				JSON.stringify(Array.from(new Set(user.rooms).add(roomname))),
				username
			]
		});

		await trx.execute({
			sql: "UPDATE rooms SET members = ? WHERE name = ?",
			args: [
				JSON.stringify(Array.from(new Set(room.members).add(username))),
				roomname.toLowerCase()
			]
		});

		// Commit the transaction
		await trx.commit();
	} catch (err) {
		// Something went wrong, rollback the transaction
		await trx.rollback();
		return false;
	}

	// Apply the changes to the cache
	user.rooms.add(roomname.toLowerCase());
	room.members.add(username);

	trx.close();
	return true;
}

export async function removeUserFromRoom(username: string, roomname: string) {
	const user = await getUserSession(username);
	if (user === null) return false;

	const room = await getRoom(roomname);
	if (room === null) return false;

	const userRoomsCopy = new Set(user.rooms);
	const roomMembersCopy = new Set(room.members);

	userRoomsCopy.delete(roomname);
	roomMembersCopy.delete(username);

	const trx = await turso.transaction("write");
	try {
		await trx.execute({
			sql: "UPDATE users SET rooms = ? WHERE username = ?",
			args: [JSON.stringify(Array.from(userRoomsCopy)), username]
		});

		await trx.execute({
			sql: "UPDATE rooms SET members = ? WHERE name = ?",
			args: [
				JSON.stringify(Array.from(roomMembersCopy)),
				roomname.toLowerCase()
			]
		});

		// Commit the transaction
		await trx.commit();
	} catch (err) {
		// Something went wrong, rollback the transaction
		await trx.rollback();
		return false;
	}

	// Apply the changes to the cache
	user.rooms.delete(roomname.toLowerCase());
	room.members.delete(username);

	trx.close();
	return true;
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
	return await turso
		.execute({
			sql: "SELECT 1 FROM rooms WHERE name = ? LIMIT 1",
			args: [roomname.toLowerCase()]
		})
		.then((result) => result.rows.length > 0)
		.catch(() => true); // Assume the room exists if an error occurs
}

export async function createRoom(
	roomname: string,
	description: string | null = null
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

	return await turso
		.execute({
			sql: "INSERT OR IGNORE INTO rooms (name, description, publicKey, privateKey) VALUES (?, ?, ?, ?)",
			args: [
				roomname.toLowerCase(),
				description ?? "",
				publicKey,
				privateKey
			]
		})
		.then(() => true)
		.catch(() => false);
}

export async function getRoom(roomname: string): Promise<Room | null> {
	const result = await turso
		.execute({
			sql: "SELECT * FROM rooms WHERE name = ? LIMIT 1",
			args: [roomname.toLowerCase()]
		})
		.catch(() => null);

	if (!result) return null;

	const row = result.rows[0];
	if (!row) return null;

	const room = row as unknown as RoomRow; // Cast row to a room

	return {
		name: room.name,
		description: room.description,
		members: new Set(JSON.parse(room.members)), // Convert to set
		armoredPublicKey: await openpgp
			.readKey({
				// Convert the public key to armored format NOTE: only here for legacy reasons
				binaryKey: new Uint8Array(room.publicKey)
			})
			.then((key) => key.armor()),
		privateKey: new Uint8Array(room.privateKey)
	} as Room;
}

export async function setUserPublicKey(
	username: string,
	publicKey: Uint8Array
) {
	return await turso
		.execute({
			sql: "UPDATE users SET publicKey = ? WHERE username = ?",
			args: [publicKey, username]
		})
		.then(() => true)
		.catch(() => false);
}

export async function getUserPublicKey(
	username: string
): Promise<Uint8Array | null> {
	return await turso
		.execute({
			sql: "SELECT publicKey FROM users WHERE username = ? LIMIT 1",
			args: [username]
		})
		.then((result) => {
			const row = result.rows[0];
			if (!row) return null;

			const user = row as unknown as UserRow; // Cast row to a user

			if (!user.publicKey) return null;

			return new Uint8Array(user.publicKey);
		})
		.catch(() => null);
}

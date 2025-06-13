import * as openpgp from "openpgp";
import bcrypt from "bcrypt";
import { Room, type UserSession } from "../types.ts";
import { db } from "./database.ts";
import { Color } from "./structures.ts";

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
				color: Color.intToHex(user.color),
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
	color: number
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
					displayName: username,
					pronouns: "",
					bio: "",
					password: await bcrypt.hash(password, 10),
					color: color,
					online: false,
					rooms: "[]"
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

			return await bcrypt.compare(password, user.password);
		})
		.catch((err) => {
			console.error("Failed to fetch users credentials", err);
			return false;
		});
}

export async function updateUserProfile(username: string, color: number) {
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

export async function addUserToRoom(
	username: string,
	roomname: string
): Promise<boolean> {
	const user = await getUserSession(username);
	if (user === null) return false;

	const room = await getRoom(roomname);
	if (room === null) return false;

	return await db
		.transaction()
		.execute(async (trx) => {
			await trx
				.updateTable("users")
				.where("username", "=", username)
				.set({
					rooms: JSON.stringify(
						Array.from(new Set(user.rooms).add(roomname))
					)
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("name", "=", roomname.toLowerCase())
				.set({
					members: JSON.stringify(
						Array.from(new Set(room.members).add(username))
					)
				})
				.executeTakeFirst();
		})
		.then(() => {
			// Apply the changes to the cache
			user.rooms.add(roomname.toLowerCase());
			room.members.add(username);
			return true;
		})
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

	const userRoomsCopy = new Set(user.rooms);
	const roomMembersCopy = new Set(room.members);

	userRoomsCopy.delete(roomname);
	roomMembersCopy.delete(username);

	return await db
		.transaction()
		.execute(async (trx) => {
			await trx
				.updateTable("users")
				.where("username", "=", username)
				.set({
					rooms: JSON.stringify(Array.from(userRoomsCopy))
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("name", "=", roomname.toLowerCase())
				.set({
					members: JSON.stringify(Array.from(roomMembersCopy))
				})
				.executeTakeFirst();
		})
		.then(() => {
			// Apply the changes to the cache
			user.rooms.delete(roomname.toLowerCase());
			room.members.delete(username);
			return true;
		})
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
	if (!roomname) return false;

	return await db
		.selectFrom("rooms")
		.select(["name"])
		.where("name", "=", roomname.toLowerCase())
		.executeTakeFirst()
		.then((room) => !!room)
		.catch((err) => {
			console.error("Failed to check if room exists", err);
			return true; // Assume the room exists if an error occurs
		});
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
			members: "[]",
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

			return new Room(
				room.name,
				room.description,
				new Set(room.members), // Convert to set
				new Uint8Array(room.privateKey),
				new Uint8Array(room.publicKey)
			);
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

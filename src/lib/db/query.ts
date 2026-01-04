import * as openpgp from "openpgp";
import bcrypt from "bcrypt";
import { Room, type UserProfile } from "../../types.ts";
import { db } from "./database.ts";
import { Color, InviteCode, Snowflake } from "../structures.ts";
import { generateColor } from "../../auth/session.ts";

// Interface functions:

export async function getUserProfileByUsername(
	username: string
): Promise<UserProfile | null> {
	return await db
		.selectFrom("users")
		.selectAll()
		.where("username", "=", username)
		.executeTakeFirst()
		.then((user) => {
			if (!user) return null;

			return {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				pronouns: user.pronouns,
				avatar: user.avatar,
				bio: user.bio,
				color: Color.intToHex(user.color),
				online: !!user.online, // Convert to boolean
				rooms: new Set(user.rooms) // Convert to set
			} satisfies UserProfile;
		})
		.catch((err) => {
			console.error("Failed to fetch user", err);
			return null;
		});
}

export async function getUserProfileById(
	userId: string
): Promise<UserProfile | null> {
	return await db
		.selectFrom("users")
		.selectAll()
		.where("id", "=", userId)
		.executeTakeFirst()
		.then((user) => {
			if (!user) return null;

			return {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				pronouns: user.pronouns,
				avatar: user.avatar,
				bio: user.bio,
				color: Color.intToHex(user.color),
				online: !!user.online, // Convert to boolean
				rooms: new Set(user.rooms) // Convert to set
			} satisfies UserProfile;
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
					id: Snowflake.generate(),
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

export async function createOrCompareUserProfile(
	username: string,
	password: string,
): Promise<Pick<UserProfile, "id" | "username"> | null> {
	// Check if the username is taken
	const existingUser = await db
		.selectFrom("users")
		.select(["id", "username", "password"])
		.where("username", "=", username)
		.executeTakeFirst()
		.catch((err) => {
			console.error("Failed to check if user exists", err);
			return null;
		});

	if (existingUser === null) return null; // Cancel if there was an error

	if (existingUser) {
		// Compare the password
		const correct = await bcrypt.compare(password, existingUser.password);

		if (!correct) return null;

		return {
			id: existingUser.id,
			username: existingUser.username
		};
	} else {
		// Create the user
		const newUser = await db
			.insertInto("users")
			.values({
				id: Snowflake.generate(),
				username: username,
				displayName: username,
				pronouns: "",
				bio: "",
				password: await bcrypt.hash(password, 10),
				color: generateColor(),
				online: false,
				rooms: "[]"
			})
			.returning(["id", "username"])
			.executeTakeFirst();

		if (!newUser) return null; // Cancel if there was an error

		return {
			id: newUser.id,
			username: newUser.username
		};
	}
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
	roomId: string
): Promise<boolean> {
	const user = await getUserProfileByUsername(username);
	if (user === null) return false;

	const room = await getRoomById(roomId);
	if (room === null) return false;

	return await db
		.transaction()
		.execute(async (trx) => {
			await trx
				.updateTable("users")
				.where("username", "=", username)
				.set({
					rooms: JSON.stringify(
						Array.from(new Set(user.rooms).add(roomId))
					)
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("id", "=", roomId)
				.set({
					members: JSON.stringify(
						Array.from(new Set(room.members).add(user.id))
					)
				})
				.executeTakeFirst();
		})
		.then(() => {
			// Apply the changes to the cache
			user.rooms.add(roomId);
			room.members.add(user.id);
			return true;
		})
		.catch((err) => {
			console.error("Failed to add user to room", err);
			return false;
		});
}

export async function removeUserFromRoom(username: string, roomId: string) {
	const user = await getUserProfileByUsername(username);
	if (user === null) return false;

	const room = await getRoomById(roomId);
	if (room === null) return false;

	const userRoomsCopy = new Set(user.rooms);
	const roomMembersCopy = new Set(room.members);

	userRoomsCopy.delete(roomId);
	roomMembersCopy.delete(user.id);

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
				.where("id", "=", roomId)
				.set({
					members: JSON.stringify(Array.from(roomMembersCopy))
				})
				.executeTakeFirst();
		})
		.then(() => {
			// Apply the changes to the cache
			user.rooms.delete(roomId);
			room.members.delete(user.id);
			return true;
		})
		.catch((err) => {
			console.error("Failed to remove user from room", err);
			return false;
		});
}

export async function createRoom(
	roomname: string,
	description = "No description provided"
): Promise<Room | null> {
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
	const room = await db
		.insertInto("rooms")
		.values({
			id: Snowflake.generate(),
			name: roomname.toLowerCase(),
			description: description,
			members: "[]",
			publicKey: publicKeyBuffer,
			privateKey: privateKeyBuffer
		})
		.returningAll()
		.executeTakeFirst()
		.catch((err) => {
			console.error("Failed to create room", err);

			return null;
		});

	if (!room) return null;

	return new Room(
		room.id,
		room.name,
		room.description,
		new Set(room.members), // Convert to set
		new Uint8Array(room.privateKey),
		new Uint8Array(room.publicKey)
	);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
	return await db
		.selectFrom("rooms")
		.selectAll()
		.where("id", "=", roomId)
		.executeTakeFirst()
		.then((room) => {
			if (!room) return null;

			return new Room(
				room.id,
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

export async function getUserPublicKeyByUsername(
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

export async function createRoomInvite(roomId: string, userId: string): Promise<string | null> {
	const code = InviteCode.generate();

	return await db
		.insertInto("roomInvites")
		.values({
			id: Snowflake.generate(),
			code: code,
			roomId: roomId,
			inviter: userId,
			createdAt: new Date().toISOString()
		})
		.executeTakeFirst()
		.then(() => code)
		.catch((err) => {
			console.error("Failed to create room invite", err);
			return null;
		});
}

export async function getRoomByInviteCode(code: string): Promise<Room | null> {
	return await db
		.selectFrom("roomInvites")
		.where("code", "=", code)
		.innerJoin("rooms", "rooms.id", "roomInvites.roomId")
		.selectAll("rooms")
		.executeTakeFirst()
		.then((room) => {
			if (!room) return null;

			return new Room(
				room.id,
				room.name,
				room.description,
				new Set(room.members), // Convert to set
				new Uint8Array(room.privateKey),
				new Uint8Array(room.publicKey)
			);
		})
		.catch((err) => {
			console.error("Failed to fetch room invite", err);
			return null;
		});
}

export async function addMediaEntry(
	id: string,
	path: string,
	userId: string,
	mimeType: string,
): Promise<boolean> {
	return await db
		.insertInto("media")
		.values({
			id: id,
			path: path,
			userId: userId,
			mimeType: mimeType,
			alternativeText: null
		})
		.executeTakeFirst()
		.then((media) => {
			if (!media.numInsertedOrUpdatedRows) return false;

			return true;
		})
		.catch((err) => {
			console.error("Failed to add media entry", err);
			return false;
		});
}

export async function getMediaById(id: string): Promise<{
	path: string;
	userId: string;
	mimeType: string;
	alternativeText: string | null;
} | null> {
	return await db
		.selectFrom("media")
		.where("id", "=", id)
		.select(["path", "userId", "mimeType", "alternativeText"])
		.executeTakeFirst()
		.then((media) => {
			if (!media) return null;

			return media;
		})
		.catch((err) => {
			console.error("Failed to fetch media", err);
			return null;
		});
}

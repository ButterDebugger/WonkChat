import * as openpgp from "openpgp";
import { Room } from "../../../types.ts";
import { db } from "../database.ts";
import { InviteCode, Snowflake } from "../../structures.ts";
import { getUserProfileByUsername } from "./users.ts";

export async function addUserToRoom(username: string, roomId: string): Promise<boolean> {
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
					rooms: JSON.stringify(Array.from(new Set(user.rooms).add(roomId))),
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("id", "=", roomId)
				.set({
					members: JSON.stringify(Array.from(new Set(room.members).add(user.id))),
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
					rooms: JSON.stringify(Array.from(userRoomsCopy)),
				})
				.executeTakeFirst();

			await trx
				.updateTable("rooms")
				.where("id", "=", roomId)
				.set({
					members: JSON.stringify(Array.from(roomMembersCopy)),
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
	description = "No description provided",
): Promise<Room | null> {
	const { publicKey, privateKey } = await openpgp.generateKey({
		type: "curve25519",
		userIDs: [
			{
				name: roomname,
			},
		],
		format: "binary",
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
			privateKey: privateKeyBuffer,
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
		new Uint8Array(room.publicKey),
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
				new Uint8Array(room.publicKey),
			);
		})
		.catch((err) => {
			console.error("Failed to fetch room", err);
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
				new Uint8Array(room.publicKey),
			);
		})
		.catch((err) => {
			console.error("Failed to fetch room invite", err);
			return null;
		});
}

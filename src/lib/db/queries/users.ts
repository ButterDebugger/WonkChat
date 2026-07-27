import bcrypt from "bcrypt";
import { type UserProfile } from "../../../types.ts";
import { db } from "../database.ts";
import { Color, Snowflake } from "../../structures.ts";
import { generateColor } from "../../../api/auth/session.ts";

export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
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
				rooms: new Set(user.rooms), // Convert to set
			} satisfies UserProfile;
		})
		.catch((err) => {
			console.error("Failed to fetch user", err);
			return null;
		});
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
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
				rooms: new Set(user.rooms), // Convert to set
			} satisfies UserProfile;
		})
		.catch((err) => {
			console.error("Failed to fetch user", err);
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
			username: existingUser.username,
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
				rooms: "[]",
				lastOnline: new Date().toISOString(),
			})
			.returning(["id", "username"])
			.executeTakeFirst();

		if (!newUser) return null; // Cancel if there was an error

		return {
			id: newUser.id,
			username: newUser.username,
		};
	}
}

export async function setUserStatus(username: string, online: boolean) {
	return await db
		.updateTable("users")
		.where("username", "=", username)
		.set({
			online: online,
			lastOnline: new Date().toISOString(),
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to update users status", err);
			return false;
		});
}

export async function setUserPublicKey(username: string, publicKey: Uint8Array) {
	// Convert Uint8Array to ArrayBuffer
	const buffer = new ArrayBuffer(publicKey.length);
	new Uint8Array(buffer).set(publicKey);

	// Update users table
	return await db
		.updateTable("users")
		.where("username", "=", username)
		.set({
			publicKey: buffer,
		})
		.executeTakeFirst()
		.then(() => true)
		.catch((err) => {
			console.error("Failed to update users public key", err);
			return false;
		});
}

export async function getUserPublicKeyByUsername(username: string): Promise<Uint8Array | null> {
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

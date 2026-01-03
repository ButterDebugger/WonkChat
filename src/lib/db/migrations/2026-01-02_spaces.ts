import type { Kysely } from "kysely";
import { Snowflake } from "../../structures.ts";
import { Database, RoomTable, UserTable } from "../database.ts";

export async function up(db: Kysely<Database & {
	__new_users: UserTable;
	__new_rooms: RoomTable;
}>): Promise<void> {
	// Create a new users table
	await db.schema
		.createTable("__new_users")
		.addColumn("id", "text", (col) => col.notNull().primaryKey())
		.addColumn("username", "text", (col) => col.notNull().unique())
		.addColumn("displayName", "text", (col) => col.notNull())
		.addColumn("pronouns", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("avatar", "text")
		.addColumn("bio", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("password", "text", (col) => col.notNull())
		.addColumn("color", "binary(3)", (col) => col.notNull().defaultTo(0xffffff))
		.addColumn("rooms", "jsonb", (col) => col.notNull().defaultTo("[]"))
		.addColumn("online", "boolean", (col) => col.notNull().defaultTo(false))
		.addColumn("publicKey", "blob")
		.execute();

	// Copy the data from the old users table to the new one
	const tempUserIds = await db.insertInto("__new_users")
		.expression((eb) => eb
			.selectFrom("users")
			.select([
				(eb) => eb.fn<string>("random").as("id"), // Create a random placeholder ID for each user
				"username",
				"displayName",
				"pronouns",
				"avatar",
				"bio",
				"password",
				"color",
				eb.val("[]").as("rooms"), // Reset the rooms
				"online",
				"publicKey"
			])
		)
		.returning("id")
		.execute();

	// Create snowflake IDs for each user
	for (const user of tempUserIds) {
		await db
			.updateTable("__new_users")
			.where("id", "=", user.id)
			.set({
				id: Snowflake.generate()
			})
			.executeTakeFirst();
	}

	// Drop the old users table
	await db.schema
		.dropTable("users")
		.execute();

	// Rename the new users table
	await db.schema
		.alterTable("__new_users")
		.renameTo("users")
		.execute();

	// Create a new spaces table
	await db.schema
		.createTable("spaces")
		.addColumn("id", "text", (col) => col.notNull().primaryKey())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("description", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("members", "jsonb", (col) => col.notNull().defaultTo("[]"))
		.execute();

	// Create a new rooms table
	await db.schema
		.createTable("__new_rooms")
		.addColumn("id", "text", (col) => col.notNull().primaryKey())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("description", "text", (col) => col.notNull())
		.addColumn("members", "jsonb", (col) => col.notNull())
		.addColumn("publicKey", "blob", (col) => col.notNull())
		.addColumn("privateKey", "blob", (col) => col.notNull())
		.addColumn("parentSpace", "text", (col) =>
			col.references("spaces.id")
		)
		.addForeignKeyConstraint(
			"foreign_parent_space",
			["parentSpace"],
			"spaces",
			["id"]
		)
		.execute();

	await db.schema
		.createIndex("index_rooms_parentSpace")
		.on("__new_rooms")
		.column("parentSpace")
		.execute();

	// Copy the data from the old rooms table to the new one
	const tempRoomIds = await db.insertInto("__new_rooms")
		.expression((eb) => eb
			.selectFrom("rooms")
			.select([
				(eb) => eb.fn<string>("random").as("id"), // Create a random placeholder ID for each room
				"name",
				"description",
				eb.val("[]").as("members"), // Reset the members
				"publicKey",
				"privateKey",
				eb.lit(null).as("parentSpace")
			])
		)
		.returning("id")
		.execute();

	// Create snowflake IDs for each room
	for (const room of tempRoomIds) {
		await db
			.updateTable("__new_rooms")
			.where("id", "=", room.id)
			.set({
				id: Snowflake.generate()
			})
			.executeTakeFirst();
	}

	// Drop the old rooms table
	await db.schema
		.dropTable("rooms")
		.execute();

	// Rename the new rooms table
	await db.schema
		.alterTable("__new_rooms")
		.renameTo("rooms")
		.execute();

	// Create a new room invites table
	await db.schema
		.createTable("roomInvites")
		.addColumn("id", "text", (col) => col.notNull().primaryKey())
		.addColumn("code", "text", (col) => col.notNull().unique())
		.addColumn("roomId", "text", (col) => col.notNull().references("rooms.id"))
		.addForeignKeyConstraint(
			"foreign_room",
			["roomId"],
			"rooms",
			["id"]
		)
		.addColumn("inviter", "text", (col) => col.notNull().references("users.id"))
		.addForeignKeyConstraint(
			"foreign_inviter",
			["inviter"],
			"users",
			["id"]
		)
		.addColumn("createdAt", "text", (col) => col.notNull())
		.execute();
}

import type { Kysely } from "kysely";
import { Color } from "../structures.ts";
import { Database } from "../database.ts";

export async function up(db: Kysely<Database>): Promise<void> {
	const usersData = await db.selectFrom("users").selectAll().execute();

	await db.schema.dropTable("users").execute();

	await db.schema
		.createTable("users")
		.addColumn("username", "text", (col) => col.primaryKey())
		.addColumn("displayName", "text", (col) => col.notNull())
		.addColumn("pronouns", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("avatar", "text")
		.addColumn("bio", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("password", "text", (col) => col.notNull())
		.addColumn("color", "binary(3)", (col) =>
			col.notNull().defaultTo(0xffffff)
		)
		.addColumn("rooms", "jsonb", (col) => col.notNull().defaultTo("[]"))
		.addColumn("online", "boolean", (col) => col.notNull().defaultTo(false))
		.addColumn("publicKey", "blob")
		.execute();

	for (const user of usersData) {
		await db
			.insertInto("users")
			.values({
				username: user.username,
				displayName: user.displayName,
				pronouns: "",
				avatar: null,
				bio: "",
				password: user.password,
				color: user.color,
				rooms: JSON.stringify(user.rooms),
				online: user.online,
				publicKey: user.publicKey
			})
			.executeTakeFirst();
	}
}

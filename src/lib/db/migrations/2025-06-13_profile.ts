// @ts-nocheck
import type { Kysely } from "kysely";
import { Color } from "../../structures.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
	const usersData = await db.selectFrom("users").selectAll().execute();

	await db.schema.dropTable("users").execute();

	await db.schema
		.createTable("users")
		.addColumn("username", "text", (col) => col.primaryKey())
		.addColumn("displayName", "text", (col) => col.notNull())
		.addColumn("pronouns", "text", (col) => col.notNull().defaultTo(""))
		.addColumn("avatar", "blob")
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
				avatar: undefined,
				bio: "",
				password: user.password,
				color: Color.hexToInt(user.color),
				rooms: JSON.stringify(user.rooms),
				online: user.online,
				publicKey: user.publicKey
			})
			.executeTakeFirst();
	}
}

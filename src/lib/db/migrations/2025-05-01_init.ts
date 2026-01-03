import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
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

	await db.schema
		.createTable("rooms")
		.addColumn("name", "text", (col) => col.primaryKey())
		.addColumn("description", "text", (col) => col.notNull())
		.addColumn("members", "jsonb", (col) => col.notNull())
		.addColumn("publicKey", "blob", (col) => col.notNull())
		.addColumn("privateKey", "blob", (col) => col.notNull())
		.execute();
}

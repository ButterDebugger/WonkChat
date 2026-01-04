import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	// Create a new users table
	await db.schema
		.createTable("media")
		.addColumn("id", "text", (col) => col.notNull().primaryKey())
		.addColumn("path", "text", (col) => col.notNull().unique())
		.addColumn("userId", "text", (col) => col.notNull().references("users.id"))
		.addForeignKeyConstraint(
			"foreign_user",
			["userId"],
			"users",
			["id"]
		)
		.addColumn("mimeType", "text", (col) => col.notNull())
		.addColumn("alternativeText", "text")
		.execute();
}

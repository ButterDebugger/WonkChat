import { type Kysely } from "kysely";
import { Database } from "../database.ts";

export async function up(db: Kysely<Database>): Promise<void> {
	// Drop the createdAt column from roomInvites
	await db.schema
		.alterTable("roomInvites")
		.dropColumn("createdAt")
		.execute();

	// Add a lastOnline column to users
	await db.schema
		.alterTable("users")
		.addColumn("lastOnline", "text", (col) => col.defaultTo(null))
		.execute();

	// Set the lastOnline column to the current time for all users
	await db
		.updateTable("users")
		.where("lastOnline", "is", null)
		.set({
			lastOnline: new Date().toISOString()
		})
		.execute();
}

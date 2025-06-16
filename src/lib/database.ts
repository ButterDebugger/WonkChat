import fs from "node:fs/promises";
import path from "node:path";
import {
	FileMigrationProvider,
	type JSONColumnType,
	Kysely,
	Migrator,
	ParseJSONResultsPlugin,
	type Generated
} from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import {
	database_auth_token,
	database_sync_url,
	database_url
} from "./config.ts";

// Setup database client
export const db = new Kysely<Database>({
	dialect: new LibsqlDialect({
		url: database_url,
		syncUrl: database_sync_url,
		authToken: database_auth_token,
		syncInterval: 60 // Sync every minute
	}),
	plugins: [new ParseJSONResultsPlugin()]
});

// Migrate database to the latest version
const migrator = new Migrator({
	db,
	provider: new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(__dirname, "./migrations")
	})
});

const { error, results } = await migrator.migrateToLatest();

if (error || typeof results === "undefined") {
	console.error("Failed to migrate database", error);
	process.exit(1);
}

for (const it of results) {
	switch (it.status) {
		case "Success":
			console.log(
				`Migration "${it.migrationName}" was executed successfully`
			);
			break;
		case "NotExecuted":
			console.log(
				`"${it.migrationName}" was skipped because it was already executed`
			);
			break;
		case "Error":
			console.error(`Failed to execute migration "${it.migrationName}"`);
			break;
	}
}

// Declare database table types
export interface Database {
	users: UserTable;
	rooms: RoomTable;
}

export interface UserTable {
	username: Generated<string>;
	displayName: string;
	pronouns: string;
	avatar: string | null;
	bio: string;
	password: string;
	color: number;
	rooms: JSONColumnType<string[]>;
	online: boolean;
	publicKey: (ArrayBuffer & { buffer?: undefined }) | undefined;
}

export interface RoomTable {
	name: Generated<string>;
	description: string;
	members: JSONColumnType<string[]>;
	publicKey: ArrayBuffer & { buffer?: undefined };
	privateKey: ArrayBuffer & { buffer?: undefined };
}

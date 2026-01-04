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
} from "../config.ts";

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
	roomInvites: RoomInviteTable;
	spaces: SpaceTable;
	media: MediaTable;
}

export interface UserTable {
	/** Primary key */
	id: Generated<string>;
	/** Unique username */
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
	/** ISO timestamp */
	lastOnline: string | null;
}

export interface RoomTable {
	/** Primary key */
	id: Generated<string>;
	name: string;
	description: string;
	members: JSONColumnType<string[]>;
	publicKey: ArrayBuffer & { buffer?: undefined };
	privateKey: ArrayBuffer & { buffer?: undefined };
	/** Parent space ID, or null if it does not belong to a space */
	parentSpace: string | null;
}

export interface RoomInviteTable {
	/** Primary key */
	id: Generated<string>;
	/** Unique code */
	code: string;
	/** Room ID */
	roomId: string;
	/** The user ID of the user who created the invite */
	inviter: string;
}

export interface SpaceTable {
	/** Primary key */
	id: Generated<string>;
	name: string;
	description: string;
	members: JSONColumnType<string[]>;
}

export interface MediaTable {
	/** Primary key */
	id: Generated<string>;
	/** The unique path to the media on the S3 bucket */
	path: string;
	/** The user ID of the user who uploaded the media */
	userId: string;
	/** The MIME type of the media */
	mimeType: string;
	/** The alternative text of the media */
	alternativeText: string | null;
}

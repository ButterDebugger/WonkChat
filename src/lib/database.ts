import { Kysely, type Generated, type JSONColumnType } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import {
	database_auth_Token,
	database_sync_url,
	database_url
} from "./config.ts";

// Setup database client
export const db = new Kysely<Database>({
	dialect: new LibsqlDialect({
		url: database_url,
		syncUrl: database_sync_url,
		authToken: database_auth_Token,
		syncInterval: 60 // Sync every minute
	})
});

// Declare database types
export interface Database {
	users: UserTable;
	rooms: RoomTable;
}

export interface UserTable {
	username: Generated<string>;
	displayName: string;
	password: string;
	color: string;
	rooms: JSONColumnType<string[]>;
	online: boolean;
	publicKey: string | undefined;
}

export interface RoomTable {
	name: Generated<string>;
	description: string;
	members: JSONColumnType<string[]>;
	publicKey: string;
	privateKey: string;
}

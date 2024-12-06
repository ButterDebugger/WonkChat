import Pool from "pg-pool";
import {
	Kysely,
	PostgresDialect,
	type Generated,
	type JSONColumnType,
} from "kysely";
import { database_url } from "./config.ts";

// Setup database client
const params = new URL(database_url);
const dialect = new PostgresDialect({
	pool: new Pool({
		user: params.username,
		password: params.password,
		host: params.hostname,
		port: params.port,
		database: params.pathname.split("/")[1],
	}),
});

export const db = new Kysely<Database>({
	dialect,
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

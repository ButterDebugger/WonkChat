import { UUID } from "crypto";
import { JwtPayload } from "jsonwebtoken";
import { Key } from "openpgp";

export interface TokenPayload extends JwtPayload {
	username: string;
	jti: UUID;
	iat: number;
}
export interface UserSession {
	username: string;
	color: string;
	offline: boolean;
	online: boolean;
	rooms: Set<string>;
}
export interface Room {
	name: string;
	description: string;
	/** Set of usernames */
	members: Set<string>;
	privateKey: Uint8Array;
	armoredPublicKey: Key;
}

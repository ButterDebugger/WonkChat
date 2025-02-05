import type { UUID } from "node:crypto";
import type { JwtPayload } from "jsonwebtoken";
import type { Key } from "openpgp";

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
export interface User extends UserSession {
	username: string;
	color: string;
	offline: boolean;
	online: boolean;
	rooms: Set<string>;
	// Added fields
	displayName: string;
	password: string;
	publicKey: Uint8Array;
}
export interface Room {
	name: string;
	description: string;
	/** Set of usernames */
	members: Set<string>;
	privateKey: Uint8Array;
	armoredPublicKey: Key;
}
export interface Message {
	content: string;
	attachments: string[];
}
export function isMessage(value: Message): value is Message {
	if (typeof value !== "object") return false;
	if (typeof value?.content !== "string") return false;
	if (!Array.isArray(value?.attachments)) return false;
	if (!value?.attachments.every((value) => typeof value === "string"))
		return false;
	return true;
}
export interface Upload {
	filename: string;
	size: number;
	hash: string;
	path: string;
	success: boolean;
}

// Database types:
export interface UserRow {
	username: string;
	displayName: string;
	password: string;
	color: string;
	rooms: string;
	online: boolean;
	publicKey: Uint8Array;
}
export interface RoomRow {
	name: string;
	description: string;
	members: string;
	publicKey: Uint8Array;
	privateKey: Uint8Array;
}

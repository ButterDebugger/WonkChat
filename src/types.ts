import type { JWTPayload } from "hono/utils/jwt/types";
import type { UUID } from "node:crypto";
import * as openpgp from "openpgp";

export interface TokenPayload extends JWTPayload {
	username: string;
	jti: UUID;
	/** Unix timestamp in seconds when the token was issued */
	iat: number;
}
export interface UserSession {
	username: string;
	color: string;
	offline: boolean;
	online: boolean;
	rooms: Set<string>;
}
export class Room {
	constructor(
		public name: string,
		public description: string,
		/** Set of usernames */
		public members: Set<string>,
		public privateKey: Uint8Array,
		public publicKey: Uint8Array
	) {}

	/** @returns The public key in armored format */
	get armoredPublicKey() {
		return openpgp
			.readKey({ binaryKey: this.publicKey })
			.then((key) => key.armor());
	}
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

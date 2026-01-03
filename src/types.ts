import type { JWTPayload } from "hono/utils/jwt/types";
import type { UUID } from "node:crypto";
import * as openpgp from "openpgp";

export interface TokenPayload extends JWTPayload {
	id: string;
	username: string;
	jti: UUID;
	/** Unix timestamp in seconds when the token was issued */
	iat: number;
	/** Version of the token */
	version: number;
}
export interface WSData {
	id: string;
	subscriptions: Set<string>;
}
export interface UserProfile {
	id: string;
	username: string;
	displayName: string;
	pronouns: string;
	/** Data URI of a profile picture */
	avatar: string | null;
	bio: string;
	/** Hex string */
	color: string;
	online: boolean;
	rooms: Set<string>;
}
export class Room {
	constructor(
		public id: string,
		public name: string,
		public description: string,
		/** Set of user ids */
		public members: Set<string>,
		public privateKey: Uint8Array,
		public publicKey: Uint8Array
	) { }

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

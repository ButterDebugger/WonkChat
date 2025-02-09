import type { JWTPayload } from "hono/utils/jwt/types";
import type { UUID } from "node:crypto";

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
export interface Room {
	name: string;
	description: string;
	/** Set of usernames */
	members: Set<string>;
	privateKey: Uint8Array;
	publicKey: Uint8Array;
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

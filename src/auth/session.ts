import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { token_secret } from "../lib/config.js";
import type { Request, Response } from "express";
import type { TokenPayload } from "../types.js";

/**
 * Handles request authentication by ending the response if the request is not authenticated,
 * otherwise the token will be returned
 * @returns Token payload
 */
export async function authenticateHandler(
	req: Request,
	res: Response,
): Promise<TokenPayload | null> {
	const payload = await authenticateRequest(req);

	if (payload === null) {
		// TODO: respond with a different error if the session token has expired
		res.status(400).json({
			error: true,
			message: "Invalid credentials",
			code: 501,
		});
		res.end();
		return null;
	}

	return payload;
}

/**
 * Authenticates a user's request
 * @returns Token payload
 */
export async function authenticateRequest(
	req: Request,
): Promise<TokenPayload | null> {
	const authHeader = req.headers.authorization;
	const wsProtocol = req.headers["sec-websocket-protocol"];

	// Retrieve the token from the request headers
	let token: string | undefined;

	if (typeof authHeader === "string") {
		const match = authHeader.match(/Bearer (.*)/);

		// Authorization header does not match the expected format
		if (match === null) return null;

		token = match[1];
	} else if (typeof wsProtocol === "string") {
		const args = wsProtocol.split(/, ?/g);
		const authIndex = args.indexOf("Authorization");

		// Authorization isn't in the websocket protocol or the token is missing
		if (authIndex === -1 || authIndex + 1 >= args.length) return null;

		token = args[authIndex + 1];
	} else return null;

	// Verify the token and return the payload
	if (typeof token !== "string") return null;

	return verifyToken(token);
}

/**
 * @returns Token payload
 */
function verifyToken(token: string): TokenPayload | null {
	// A token was not provided
	if (typeof token !== "string") return null;

	let user: TokenPayload;
	try {
		user = jwt.verify(token, token_secret) as TokenPayload;
	} catch (err) {
		return null;
	}

	// Check if token is too old
	if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14) return null;

	// Return the user
	return user;
}

export function generateColor(): string {
	const randomInt = (min = 0, max = 1) =>
		Math.floor(Math.random() * (max - min + 1) + min);

	const color: number[] = [255, randomInt(36, 255), randomInt(36, 162)];

	for (let i = color.length - 1; i > 0; i--) {
		// Shuffle rgb color array
		const j = Math.floor(Math.random() * (i + 1));
		const temp = color[i] as number;
		color[i] = color[j] as number;
		color[j] = temp;
	}

	// Return a hex string from the rgb array
	return `#${color.map((val) => `00${val.toString(16)}`.slice(-2)).join("")}`;
}

export async function sessionToken(username: string): Promise<{
	payload: TokenPayload;
	token: string;
}> {
	const payload: TokenPayload = {
		username: username,
		jti: crypto.randomUUID(),
		iat: Date.now(),
	};

	return {
		payload: payload,
		token: jwt.sign(payload, token_secret), // Create token
	};
}

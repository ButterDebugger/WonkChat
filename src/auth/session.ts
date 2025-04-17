import crypto from "node:crypto";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { verify, sign } from "hono/jwt";
import { token_secret } from "../lib/config.ts";
import type { TokenPayload } from "../types.ts";

/** Time in seconds before a session token expires */
const sessionExpiration = 60 * 60 * 24 * 14; // 14 days

export type SessionEnv = {
	Variables: {
		session: TokenPayload;
	};
};

export const authMiddleware = createMiddleware<SessionEnv>(
	async (ctx, next) => {
		const payload = await authenticateRequest(ctx);

		if (payload === null) {
			// TODO: respond with a different error if the session token has expired
			return ctx.json(
				{
					error: true,
					message: "Invalid credentials",
					code: 501,
				},
				400,
			);
		}

		ctx.set("session", payload);
		await next();
	},
);

/**
 * Authenticates a user's request
 * @returns Token payload
 */
export async function authenticateRequest(
	ctx: Context,
): Promise<TokenPayload | null> {
	const authHeader = ctx.req.header("authorization");
	const wsProtocol = ctx.req.header("sec-websocket-protocol");

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

	return await verifyToken(token);
}

/**
 * @returns Token payload
 */
async function verifyToken(token: string): Promise<TokenPayload | null> {
	// A token was not provided
	if (typeof token !== "string") return null;

	let user: TokenPayload;
	try {
		user = (await verify(token, token_secret)) as TokenPayload;
	} catch (_err) {
		return null;
	}

	// Check if token is too old
	if (user.iat + sessionExpiration < Math.floor(Date.now() / 1000)) return null;

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
		iat: Math.floor(Date.now() / 1000),
	};

	return {
		payload: payload,
		token: await sign(payload, token_secret), // Create token
	};
}

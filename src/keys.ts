import crypto from "node:crypto";
import * as openpgp from "openpgp";
import { setUserPublicKey } from "./lib/data.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";

export const router = new OpenAPIHono<SessionEnv>();

// TODO: add a cooldown for changing the public key

// User ids ~> Nonce
const nonces = new Map();

router.get("/nonce", authMiddleware, (ctx) => {
	const tokenPayload = ctx.var.session;

	// Generate a random nonce for the user to sign
	const nonce = crypto.randomBytes(256).toString("base64url");

	// Create temporary login code
	nonces.set(tokenPayload.username, nonce);

	// setTimeout(() => logins.delete(nonce), loginExpiration); // TODO: readd the expiration

	return ctx.json(
		{
			success: true,
			nonce: nonce
		},
		200
	);
});
router.post("/verify", authMiddleware, async (ctx) => {
	const tokenPayload = ctx.var.session;
	const { signedNonce, publicKey } = await ctx.req.json();

	if (typeof signedNonce !== "string" || typeof publicKey !== "string")
		return ctx.json(
			{
				error: true,
				message: "Invalid body",
				code: 101
			},
			400
		);

	// Check if login nonce exists
	if (!nonces.has(tokenPayload.username))
		return ctx.json(
			{
				error: true,
				message: "Nonce has expired",
				code: 505
			},
			400
		);

	// Verify the signed nonce
	let unsignedNonce: object;
	let armoredKey: openpgp.Key;

	try {
		armoredKey = await openpgp.readKey({ armoredKey: publicKey });
		const { data } = await openpgp.verify({
			message: await openpgp.readMessage({
				armoredMessage: signedNonce
			}),
			verificationKeys: armoredKey
		});
		unsignedNonce = data;
	} catch (_err) {
		return ctx.json(
			{
				error: true,
				message: "Invalid public key",
				code: 503
			},
			400
		);
	}

	// Match the nonce
	const nonce = nonces.get(tokenPayload.username);
	nonces.delete(tokenPayload.username);

	if (unsignedNonce !== nonce)
		return ctx.json(
			{
				error: true
				// TODO: write an error message
			},
			400
		);

	// Save public key
	const success = await setUserPublicKey(
		tokenPayload.username,
		armoredKey.write()
	);

	if (!success)
		return ctx.json(
			{
				error: true,
				message: "Internal server error",
				code: 106
			},
			500
		);

	return ctx.json(
		{
			success: true
		},
		200
	);
});

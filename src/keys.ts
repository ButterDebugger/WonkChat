import crypto from "node:crypto";
import * as openpgp from "openpgp";
import { setUserPublicKey } from "./lib/data.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HttpSessionHeadersSchema, ErrorSchema } from "./lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

// TODO: add a cooldown for changing the public key

// User ids ~> Nonce
const nonces = new Map();

router.openapi(
	createRoute({
		method: "get",
		path: "/nonce",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema
		},
		responses: {
			200: {
				description: "Success message"
			}
		}
	}),
	(ctx) => {
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
	}
);

router.openapi(
	createRoute({
		method: "post",
		path: "/verify",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			body: {
				content: {
					"application/json": {
						schema: z.object({
							signedNonce: z.string(),
							publicKey: z.string()
						})
					}
				}
			}
		},
		responses: {
			200: {
				description: "Success message"
			},
			400: {
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				},
				description: "Returns an error"
			},
			500: {
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				},
				description: "Something went wrong internally"
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { signedNonce, publicKey } = ctx.req.valid("json");

		if (typeof signedNonce !== "string" || typeof publicKey !== "string")
			return ctx.json(
				{
					success: false,
					message: "Invalid body",
					code: 101
				},
				400
			);

		// Check if login nonce exists
		if (!nonces.has(tokenPayload.username))
			return ctx.json(
				{
					success: false,
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
					success: false,
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
					success: false
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
					success: false,
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
	}
);

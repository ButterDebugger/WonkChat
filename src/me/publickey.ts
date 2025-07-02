import * as openpgp from "openpgp";
import { setUserPublicKey } from "../lib/data.ts";
import { authMiddleware, type SessionEnv } from "../auth/session.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HttpSessionHeadersSchema, ErrorSchema } from "../lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

// TODO: add a cooldown for changing the public key

router.openapi(
	createRoute({
		method: "post",
		path: "/",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			body: {
				content: {
					"application/json": {
						schema: z.object({
							publicKey: z.string().openapi({
								description: "The public key"
							}),
							signature: z.string().openapi({
								description: "The signature of the public key"
							})
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
				description: "Returns an error",
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				}
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { publicKey, signature } = ctx.req.valid("json");

		if (typeof publicKey !== "string" || typeof signature !== "string")
			return ctx.json(
				{
					success: false,
					message: "Invalid body",
					code: 101
				},
				400
			);

		// Read the public key
		let armoredKey: openpgp.Key;

		try {
			armoredKey = await openpgp.readKey({ armoredKey: publicKey });
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

		// Verify the signature
		try {
			const { data } = await openpgp.verify({
				message: await openpgp.readMessage({
					armoredMessage: signature
				}),
				verificationKeys: armoredKey
			});

			if (data !== publicKey)
				return ctx.json(
					{
						success: false,
						message: "Invalid signature",
						code: 504
					},
					400
				);
		} catch (_err) {
			return ctx.json(
				{
					success: false,
					message: "Invalid signature",
					code: 504
				},
				400
			);
		}

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

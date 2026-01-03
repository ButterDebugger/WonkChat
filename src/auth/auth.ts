import type { Context, Env, Input } from "hono";
import { getConnInfo } from "hono/bun";
import { rateLimiter } from "hono-rate-limiter";
import crypto from "node:crypto";
import { createMiddleware } from "hono/factory";
import loginRoute from "./login.tsx";
import { generateColor, type SessionEnv, sessionToken } from "./session.ts";
import { compareUserProfile, createOrCompareUserProfile, createUserProfile } from "../lib/db/query.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	PasswordSchema,
	UsernameSchema
} from "../lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

const accessUsers = new Map<string, string>();
const accessExpiration = 60_000; // 1 minute
const limiter = rateLimiter({
	windowMs: 5 * 60 * 1000, // 5 minutes
	limit: 20, // limit each IP to 20 requests per windowMs
	message: "Too many requests",
	// @ts-ignore: This type is wrong but it works
	keyGenerator: (ctx: Context<Env, string, Input>) => {
		const { remote } = getConnInfo(ctx);

		return `${remote.address}:${remote.port}`;
	},
	handler: (ctx, _next, options) => {
		return ctx.json(
			{
				success: false,
				message: options.message,
				code: 502
			},
			429
		);
	}
});

const limiterMiddleware = createMiddleware((ctx, next) => limiter(ctx, next));

router.route("/login/", loginRoute);

router.openapi(
	createRoute({
		method: "post",
		path: "/token",
		middleware: [limiterMiddleware] as const,
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							verifier: z.string()
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
			}
		}
	}),
	async (ctx) => {
		const { verifier } = ctx.req.valid("json");

		// Hash verifier
		const challenge = crypto
			.createHash("sha256")
			.update(verifier)
			.digest("base64url");

		// Get the token
		const token = accessUsers.get(challenge);

		if (typeof token !== "string")
			return ctx.json(
				{
					success: false,
					message: "Invalid verifier",
					code: 501
				},
				400
			);

		// Delete the challenge
		accessUsers.delete(challenge);

		return ctx.json(
			{
				success: true,
				token: token
			},
			200
		);
	}
);

router.openapi(
	createRoute({
		method: "post",
		path: "/authorize",
		middleware: [limiterMiddleware] as const,
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							username: UsernameSchema,
							password: PasswordSchema,
							challenge: z.string()
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
		const { username, password, challenge } = ctx.req.valid("json");

		// Create a user account
		const user = await createOrCompareUserProfile(username, password);

		if (user === null)
			// NOTE: This could also mean there was an internal error
			return ctx.json(
				{
					success: false,
					message: "Invalid credentials",
					code: 501
				},
				400
			);

		// Store access token
		const { token } = await sessionToken(user.id, username);

		accessUsers.set(challenge, token);
		setTimeout(() => accessUsers.delete(challenge), accessExpiration);

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

import { z } from "@hono/zod-openapi";

export const RoomNameSchema = z
	.string()
	.regex(/^[a-z0-9_]{3,16}$/g)
	.openapi({
		example: "wonk",
		description: "Room name"
	});

export const UsernameSchema = z
	.string()
	.regex(/^(?! )[\x20-\x7E]{3,16}(?<! )$/g)
	.openapi({
		example: "john_doe",
		description: "A creative username"
	});

export const PasswordSchema = z.string().min(6).openapi({
	example: "password123",
	description: "A good password"
});

export const HttpSessionHeadersSchema = z.object({
	authorization: z.string().openapi({
		example: "Bearer TOKEN"
	})
});

export const WsSessionHeadersSchema = z.object({
	"sec-websocket-protocol": z.string().openapi({
		example: "Authorization, TOKEN"
	})
});

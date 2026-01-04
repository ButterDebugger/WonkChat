import { z } from "@hono/zod-openapi";

export const RoomNameSchema = z
	.string()
	.min(3)
	.max(100)
	.openapi({
		example: "wonk",
		description: "Room name"
	});

export const SnowflakeSchema = z
	.string()
	.regex(/^[0-9a-z]+$/g)
	.openapi({
		description: "Snowflake ID"
	});

export const UsernameSchema = z
	.string()
	.regex(/^(?! )[\x20-\x7E]{3,16}(?<! )$/g)
	.openapi({
		example: "john_doe",
		description: "An awesome username"
	});

export const PasswordSchema = z.string().min(6).openapi({
	example: "password123",
	description: "A good password"
});

export const ErrorSchema = z.object({
	success: z.literal(false),
	message: z.string().openapi({
		example: "Bad Request"
	}),
	code: z.number().openapi({
		example: 100
	})
});

export const HttpSessionHeadersSchema = z.object({
	authorization: z
		.string()
		.regex(/^Bearer .+$/g)
		.openapi({
			example: "Bearer TOKEN"
		})
});

export const WsSessionHeadersSchema = z.object({
	"sec-websocket-protocol": z.string().openapi({
		example: "Authorization, TOKEN"
	})
});

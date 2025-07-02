import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, SessionEnv } from "../auth/session.ts";
import { ErrorSchema, HttpSessionHeadersSchema } from "../lib/validation.ts";

export const router = new OpenAPIHono<SessionEnv>();

const maxChunkSize = 1024 * 1024; // 1 MB; TODO: make this a configurable constant

router.openapi(
	createRoute({
		method: "post",
		path: "/init",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			body: {
				content: {
					"application/json": {
						schema: z.object({
							name: z.string().openapi({
								description: "The name of the file"
							}),
							size: z.number().int().positive().openapi({
								description:
									"The total length of the file in bytes"
							}),
							mime: z.string().openapi({
								description: "The mime type of the file"
							})
						})
					}
				}
			}
		},
		responses: {
			200: {
				description: "Success message",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							uploadId: z.string().openapi({
								description: "The upload id"
							}),
							maxChunkSize: z.number().int().positive().openapi({
								description: "The maximum chunk size in bytes"
							})
						})
					}
				}
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
	(ctx) => {
		const { name, size, mime } = ctx.req.valid("json");

		return ctx.json(
			{
				success: true,
				uploadId: "123",
				maxChunkSize
			} as const,
			200
		);
	}
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/:id",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema.extend({
				"content-range": z.string()
			}),
			params: z.object({
				id: z.string()
			})
		},
		responses: {
			200: {
				description: "Success message",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true)
						})
					}
				}
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
	(ctx) => {
		return ctx.json(
			{
				success: true
			} as const,
			200
		);
	}
);

router.openapi(
	createRoute({
		method: "post",
		path: "/:id/complete",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				id: z.string()
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							checksum: z.string().openapi({
								description: "A sha256 checksum of the file"
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
	(ctx) => {
		const { id } = ctx.req.valid("param");
		const { checksum } = ctx.req.valid("json");

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, SessionEnv } from "../auth/session.ts";
import { HttpSessionHeadersSchema } from "../lib/validation.ts";
import { stream } from "hono/streaming";

export const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/:id/:filename",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				id: z.string(),
				filename: z.string()
			})
		},
		responses: {
			200: {
				description: "The requested file"
			}
		}
	}),
	(ctx) => {
		const { id, filename } = ctx.req.valid("param");

		return stream(ctx, async (stream) => {
			// Write a process to be executed when aborted.
			stream.onAbort(() => {
				console.log("Aborted!");
			});
			// Write a Uint8Array.
			await stream.write(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
			// Pipe a readable stream.
			// await stream.pipe(anotherReadableStream);
		});
	}
);

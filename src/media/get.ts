import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, SessionEnv } from "../auth/session.ts";
import { HttpSessionHeadersSchema } from "../lib/validation.ts";
import { stream } from "hono/streaming";
import { basename, join } from "node:path";
import { s3 } from "bun";
import { getMediaById } from "../lib/db/query.ts";

export const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "get",
		path: "/:id/:filename",
		// middleware: [authMiddleware] as const,
		request: {
			// headers: HttpSessionHeadersSchema,
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
	async (ctx) => {
		const { id, filename } = ctx.req.valid("param");

		// Get the file from the database
		const media = await getMediaById(id);

		if (!media) {
			return ctx.json(
				{
					success: false,
					message: "File does not exist",
					code: 701
				},
				400
			);
		}

		// Make sure the filename matches the one in the database
		if (basename(media.path) !== filename) {
			return ctx.json(
				{
					success: false,
					message: "Filename does not match",
					code: 702
				},
				400
			);
		}

		// Check if the file exists on the S3 bucket
		const file = s3.file(media.path);

		if (!(await file.exists())) {
			return ctx.json(
				{
					success: false,
					message: "File does not exist",
					code: 701
				},
				400
			);
		}

		// Stream the file
		const readStream = file.stream();

		ctx.header("Content-Type", media.mimeType);

		return stream(ctx, async (stream) => {
			stream.onAbort(() => {
				// TODO: handle this
				console.log("Aborted!");
			});

			for await (const chunk of readStream) {
				stream.write(chunk);
			}
		});
	}
);

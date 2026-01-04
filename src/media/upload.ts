import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware, SessionEnv } from "../auth/session.ts";
import { ErrorSchema, HttpSessionHeadersSchema } from "../lib/validation.ts";
import { bodyLimit } from "hono/body-limit";
import { maxChunkSize } from "../lib/config.ts";
import crypto from "node:crypto";
import { join } from "node:path";
import { mkdtemp, readdir, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { s3 } from "bun";
import { addMediaEntry } from "../lib/db/query.ts";
import { Snowflake } from "../lib/structures.ts";

export const router = new OpenAPIHono<SessionEnv>();

const activeUploads: Map<string, {
	filename: string;
	size: number;
	mimeType: string;
	tempPath: string;
	hashes: string[];
	hashesThatHaveNotBeenUploadedYet: Set<string>;
}> = new Map();

router.openapi(
	createRoute({
		method: "get",
		path: "/info",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
		},
		responses: {
			200: {
				description: "Success message",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							maxChunkSize: z.literal(maxChunkSize).openapi({
								description: "The maximum chunk size in bytes"
							})
						})
					}
				}
			}
		}
	}),
	(ctx) => {
		return ctx.json({
			success: true as const,
			maxChunkSize: maxChunkSize
		}, 200);
	}
);

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
							name: z.string().min(1).openapi({
								description: "The name of the file"
							}),
							size: z.number().int().min(1).positive().openapi({
								description:
									"The total length of the file in bytes"
							}),
							mimeType: z.string().openapi({
								description: "The mime type of the file"
							}),
							hashes: z.array(z.string()).min(1).openapi({
								description: "A list of hashes of the file"
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
			},
			500: {
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
		const { name, size, mimeType, hashes } = ctx.req.valid("json");

		// Create a temporary directory for the upload
		const uploadId = Snowflake.generate();
		const tempPath = await mkdtemp(join(tmpdir(), 'wonk-media-')).catch(console.error);

		if (!tempPath) {
			return ctx.json(
				{
					success: false as const,
					message: "Internal server error",
					code: 106
				},
				500
			);
		}

		// Add the upload to the list of active uploads
		activeUploads.set(uploadId, {
			filename: name,
			size: size,
			mimeType: mimeType,
			tempPath: tempPath,
			hashes: hashes,
			hashesThatHaveNotBeenUploadedYet: new Set(hashes)
		});

		return ctx.json({
			success: true as const,
			uploadId: uploadId
		}, 200);
	}
);

router.openapi(
	createRoute({
		method: "patch",
		path: "/:id",
		middleware: [authMiddleware, bodyLimit({
			maxSize: maxChunkSize + 1, // Add one byte because Hono's body limit middleware uses > and not >=
			onError: (c) => {
				return c.json(
					{
						success: false,
						message: "Request body is to large",
						code: 108
					},
					400 // NOTE: Should be 413
				);
			},
		})] as const,
		request: {
			params: z.object({
				id: z.string()
			}),
			body: {
				content: {
					"multipart/form-data": {
						schema: z.custom((e) => {
							return e?.file instanceof File
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
	async (ctx) => {
		const { id } = ctx.req.valid("param");

		// Check if the upload exists
		const upload = activeUploads.get(id);

		if (!upload) {
			return ctx.json(
				{
					success: false as const,
					message: "Upload does not exist or has been aborted by the server",
					code: 703
				},
				400
			);
		}

		// Parse the body and check if there is a file
		const { file } = await ctx.req.parseBody();

		if (!(file instanceof File)) {
			return ctx.json(
				{
					success: false as const,
					message: "Invalid body",
					code: 101
				},
				400
			);
		}

		// Hash the file and check if it is valid
		const buffer = new Uint8Array(await file.arrayBuffer());
		const hash = crypto.createHash("sha256").update(buffer).digest("hex");

		if (!upload.hashesThatHaveNotBeenUploadedYet.has(hash)) {
			return ctx.json(
				{
					success: false as const,
					message: "Chunk has already been uploaded or is invalid",
					code: 704
				},
				400
			);
		}

		// Remove the hash from the list of hashes that have not been uploaded yet
		upload.hashesThatHaveNotBeenUploadedYet.delete(hash);

		// Write the file to the temporary directory
		await Bun.write(join(upload.tempPath, hash), buffer);

		return ctx.json({
			success: true as const
		}, 200);
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
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { id } = ctx.req.valid("param");
		const { checksum } = ctx.req.valid("json");

		// Check if the upload exists
		const upload = activeUploads.get(id);

		if (!upload) {
			return ctx.json(
				{
					success: false as const,
					message: "Upload does not exist or has been aborted by the server",
					code: 703
				},
				400
			);
		}

		// Check if all hashes have been uploaded
		if (upload.hashesThatHaveNotBeenUploadedYet.size !== 0) {
			return ctx.json(
				{
					success: false as const,
					message: "Not all chunks have been uploaded",
					code: 705
				},
				400
			);
		}

		// Upload the file to S3 while checking the checksum
		const mediaPath = join(id, upload.filename);
		const file = s3.file(mediaPath);
		const sink = file.writer();
		const checksumHash = crypto.createHash("sha256");

		for (const hash of upload.hashes) {
			const file = Bun.file(join(upload.tempPath, hash));
			const buffer = new Uint8Array(await file.arrayBuffer());

			sink.write(buffer);
			checksumHash.update(buffer);

			await sink.flush();
		}

		await sink.end();

		// Delete the temporary directory
		await rmdir(upload.tempPath, { recursive: true });

		// Check if the checksum matches
		const calculatedChecksum = checksumHash.digest("hex");

		if (calculatedChecksum !== checksum) {
			await file.delete();
			activeUploads.delete(id);

			return ctx.json(
				{
					success: false as const,
					message: "Completed file does not match the expected checksum",
					code: 706
				},
				400
			);
		}

		// Save the file to the database
		await addMediaEntry(
			id,
			mediaPath,
			tokenPayload.id,
			upload.mimeType
		)

		return ctx.json({
			success: true as const,
		}, 200);
	}
);

import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
// import { Snowflake } from "./lib/identifier.ts";
// import type { Upload } from "./types.ts";
import { serveStatic } from "hono/bun";
import { OpenAPIHono } from "@hono/zod-openapi";

if (!fs.existsSync(path.join(process.cwd(), "attachments"))) {
	fs.mkdirSync(path.join(process.cwd(), "attachments"));
}

export const router = new OpenAPIHono<SessionEnv>();

// router.use(
// 	fileUpload({
// 		createParentPath: true,
// 	}),
// );

router.post("/upload", authMiddleware, async (ctx) => {
	// const tokenPayload = ctx.var.session;
	const body = await ctx.req.parseBody();

	const files: (string | File)[] = <(string | File)[]>(
		(<unknown>body["files[]"])
	);

	if (!files || Object.keys(files).length === 0) {
		return ctx.json(
			{
				error: true,
				message: "Missing files",
				code: 103
			},
			400
		);
	}

	// const hasFiles = Array.isArray(req.files.files);
	// const files = hasFiles
	// 	? (req.files.files as UploadedFile[])
	// 	: ([req.files.files] as UploadedFile[]);

	// const data = await saveFiles(files, tokenPayload.username);

	// return ctx.json(data, 200);
	return ctx.json([], 200);
});

router.use(
	"/attachments/*",
	serveStatic({ root: path.join(process.cwd(), "attachments") })
);

// function saveFiles(files: UploadedFile[], uid: string): Promise<Upload[]> {
// 	return new Promise((resolve) => {
// 		const uploaded: Upload[] = [];

// 		for (const file of files) {
// 			const fileId = Snowflake.generate();
// 			const fileLoc = `attachments/${uid}/${fileId}/${file.name}`;
// 			const filePath = path.join(Deno.cwd(), fileLoc);

// 			file.mv(filePath, (err) => {
// 				if (err) {
// 					uploaded.push({
// 						filename: file.name,
// 						size: file.size,
// 						hash: file.md5,
// 						path: fileLoc,
// 						success: false,
// 					});
// 				} else {
// 					uploaded.push({
// 						filename: file.name,
// 						size: file.size,
// 						hash: file.md5,
// 						path: fileLoc,
// 						success: true,
// 					});
// 				}

// 				if (uploaded.length === files.length) {
// 					resolve(uploaded);
// 				}
// 			});
// 		}
// 	});
// }

export function clean() {
	// Clear attachments folder
	for (const f of fs.readdirSync(path.join(process.cwd(), "attachments"))) {
		fs.rmSync(path.join(process.cwd(), "attachments", f), {
			recursive: true,
			force: true
		});
	}
}

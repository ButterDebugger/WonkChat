import express from "express";
import fileUpload, { type UploadedFile } from "express-fileupload";
import path from "node:path";
import fs from "node:fs";
import { authenticateHandler } from "./auth/session.js";
import { Snowflake } from "./lib/identifier.js";
import type { Upload } from "./types.js";

if (!fs.existsSync(path.join(process.cwd(), "attachments"))) {
	fs.mkdirSync(path.join(process.cwd(), "attachments"));
}

export const router = express.Router();

router.use(
	fileUpload({
		createParentPath: true,
	}),
);

router.post("/upload", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).json({
			error: true,
			message: "Missing files",
			code: 103,
		});
	}

	const hasFiles = Array.isArray(req.files.files);
	const files = hasFiles
		? (req.files.files as UploadedFile[])
		: ([req.files.files] as UploadedFile[]);
	const data = await saveFiles(files, tokenPayload.username);

	res.json(data);
});
router.use("/attachments", (req, res) => {
	express.static(path.join(process.cwd(), "attachments"))(req, res, () =>
		res.status(404).end(),
	);
});

function saveFiles(files: UploadedFile[], uid: string) {
	return new Promise((resolve) => {
		const uploaded: Upload[] = [];

		for (const file of files) {
			const fileId = Snowflake.generate();
			const fileLoc = `attachments/${uid}/${fileId}/${file.name}`;
			const filePath = path.join(process.cwd(), fileLoc);

			file.mv(filePath, (err) => {
				if (err) {
					uploaded.push({
						filename: file.name,
						size: file.size,
						hash: file.md5,
						path: fileLoc,
						success: false,
					});
				} else {
					uploaded.push({
						filename: file.name,
						size: file.size,
						hash: file.md5,
						path: fileLoc,
						success: true,
					});
				}

				if (uploaded.length === files.length) {
					resolve(uploaded);
				}
			});
		}
	});
}

export function clean() {
	// Clear attachments folder
	for (const f of fs.readdirSync(path.join(process.cwd(), "attachments"))) {
		fs.rmSync(path.join(process.cwd(), "attachments", f), {
			recursive: true,
			force: true,
		});
	}
}

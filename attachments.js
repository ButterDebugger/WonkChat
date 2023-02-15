import express from "express";
import fileUpload from "express-fileupload";
import path from "node:path";
import fs from "node:fs";
import seedrandom from "seedrandom";
import { authenticateToken } from "./auth.js";

const attachmentsPath = path.join(process.cwd(), "attachments");
if (!fs.existsSync(attachmentsPath)) {
    fs.mkdirSync(attachmentsPath);
}

const router = new express.Router();

router.use(fileUpload({
    createParentPath: true
}));

router.post("/upload", authenticateToken, async (req, res) => {
    if (!req.files) return res.status(400).end();

	let files = req?.files?.files;

	if (typeof files !== "object") {
		return res.status(400).end();
	} else if (!Array.isArray(files)) {
        files = [files];
    }

    var data = await saveFiles(files, req.user.id);

    res.json(data);
});
router.get("/upload", (req, res) => {
	res.redirect("/app");
});
router.use("/attachments", (req, res) => {
    express.static(path.join(process.cwd(), "attachments"))(req, res, () => {
        res.status(404).end();
    });
});

function saveFiles(files, uid) {
    return new Promise((resolve) => {
        var uploaded = [];

        files.forEach(file => {
            const rng = seedrandom(`${file.md5}/${file.name}/${process.env.FILE_SALT}`);
            const idChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

            let fileid = "";
            for (var i = 0; i < 24; i++) {
                fileid += idChars.charAt(Math.floor(rng() * idChars.length));
            }

			var fileloc = `attachments/${uid}/${fileid}/${file.name}`;
            var filepath = path.join(process.cwd(), fileloc);

            file.mv(filepath, (err) => {
                if (err) {
                    uploaded.push({
                        filename: file.name,
                        size: file.size,
                        hash: file.md5,
						path: fileloc,
                        success: false
                    });
                } else {
                    uploaded.push({
                        filename: file.name,
                        size: file.size,
                        hash: file.md5,
						path: fileloc,
                        success: true
                    });
                }

                if (uploaded.length == files.length) {
                    resolve(uploaded);
                }
            });
        });
    });
}

function clean() { // Clear attachments folder
	fs.readdirSync(path.join(process.cwd(), "attachments")).forEach(f => {
		fs.rmSync(path.join(process.cwd(), "attachments", f), {
			recursive: true,
			force: true
		});
	});
}

export default {
    router,
    clean
}
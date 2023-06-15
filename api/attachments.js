import express from "express";
import fileUpload from "express-fileupload";
import path from "node:path";
import fs from "node:fs";
import seedrandom from "seedrandom";
import { authenticate } from "../api/auth.js";

if (!fs.existsSync(path.join(process.cwd(), "storage/attachments"))) {
    fs.mkdirSync(path.join(process.cwd(), "storage/attachments"));
}

const router = new express.Router();

router.use(fileUpload({
    createParentPath: true
}));

router.post("/upload", authenticate, async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            error: true,
            message: "Missing files",
            code: 103
        });
    }

	let files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    let data = await saveFiles(files, req.user.id);

    res.json(data);
});
router.get("/upload", (req, res) => {
	res.redirect("/app");
});
router.use("/attachments", (req, res) => {
    express.static(path.join(process.cwd(), "storage/attachments"))(req, res, () => {
        res.status(404).end();
    });
});

function saveFiles(files, uid) {
    return new Promise((resolve) => {
        let uploaded = [];

        files.forEach(file => {
            const rng = seedrandom(`${file.md5}/${file.name}/${process.env.FILE_SALT}`);
            const idChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

            let fileid = "";
            for (let i = 0; i < 24; i++) {
                fileid += idChars.charAt(Math.floor(rng() * idChars.length));
            }

			let fileloc = `attachments/${uid}/${fileid}/${file.name}`;
            let filepath = path.join(process.cwd(), "storage", fileloc);

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
	fs.readdirSync(path.join(process.cwd(), "storage/attachments")).forEach(f => {
		fs.rmSync(path.join(process.cwd(), "storage/attachments", f), {
			recursive: true,
			force: true
		});
	});
}

export default {
    router,
    clean
}
import express from "express";
import fileUpload from "express-fileupload";
import path from "node:path";
import fs from "node:fs";
import { authenticate } from "./auth.js";
import { Snowflake } from "./identifier.js";

if (!fs.existsSync(path.join(process.cwd(), "attachments"))) {
    fs.mkdirSync(path.join(process.cwd(), "attachments"));
}

export const router = new express.Router();

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
    let data = await saveFiles(files, req.user.username);

    res.json(data);
});
router.use("/attachments", (req, res) => {
    express.static(path.join(process.cwd(), "attachments"))(req, res, () => {
        res.status(404).end();
    });
});

function saveFiles(files, uid) {
    return new Promise((resolve) => {
        let uploaded = [];

        files.forEach(file => {
            let fileId = Snowflake.generate();
            let fileLoc = `attachments/${uid}/${fileId}/${file.name}`;
            let filePath = path.join(process.cwd(), fileLoc);

            file.mv(filePath, (err) => {
                if (err) {
                    uploaded.push({
                        filename: file.name,
                        size: file.size,
                        hash: file.md5,
                        path: fileLoc,
                        success: false
                    });
                } else {
                    uploaded.push({
                        filename: file.name,
                        size: file.size,
                        hash: file.md5,
                        path: fileLoc,
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

export function clean() { // Clear attachments folder
    fs.readdirSync(path.join(process.cwd(), "attachments")).forEach(f => {
        fs.rmSync(path.join(process.cwd(), "attachments", f), {
            recursive: true,
            force: true
        });
    });
}

import jwt from "jsonwebtoken";
import express from "express";
import crypto from "node:crypto";
import * as openpgp from "openpgp";
import { createUserSession } from "../storage/data.js";
import { Fingerprint } from "../storage/identifier.js";
import { readSync } from "node:fs";

let guestsNames = new Map();
let loginExpiration = 60_000; // 1 minute

/*
 *  Router middleware for authenticating a user's token stored in the cookies
 */
export async function authenticate(req, res, next) {
    let result = await verifyToken(req.cookies["token"]);

    if (result.success) {
        req.user = result.user;
        next();
    } else {
        if (result.reset) {
            res.clearCookie("token");
        }

        res.redirect("/login");
    }
}

export function verifyToken(token = null) {
    return new Promise((resolve) => {
        // Token cookie was not set
        if (typeof token !== "string") return resolve({
            success: false,
            reset: false,
            user: null
        });
    
        jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
            // Token is not valid
            if (err) return resolve({
                success: false,
                reset: false,
                user: null
            });

            // Check if guest name is still available
            let name = `${user.username.toLowerCase()}#${user.discriminator}`;

            if (user.guest && !guestsNames.has(name)) {
                guestsNames.set(name, user.id)
            } else if (user.guest && guestsNames.has(name) && guestsNames.get(name) !== user.id) return resolve({
                success: false,
                reset: true,
                user: null
            });

            // Check if token is too old
            if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14) return resolve({
                success: false,
                reset: true,
                user: null
            });

            // Create the default session user
            createUserSession(user.id, {
                username: user.username,
                guest: user.guest,
                discriminator: user.discriminator,
                color: user.color
            });
            
            // Return the user
            resolve({
                success: true,
                reset: false,
                user: user
            });
        });
    });
}

function generateColor(pastel = false) {
    const randomInt = (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1) + min);

    let color = pastel ? [
        255, randomInt(162, 255), 162 // Pastel color
    ] : [
        255, randomInt(36, 255), 36 // Solid color
    ];

    for (let i = color.length - 1; i > 0; i--) { // Shuffle rgb color array
        let j = Math.floor(Math.random() * (i + 1));
        let temp = color[i];
        color[i] = color[j];
        color[j] = temp;
    }

    color = "#" + color.map(val => ("00" + val.toString(16)).slice(-2)).join(''); // Turn array into hex string
    
    return color;
}

export function sessionToken(username, publicKey) {
    let user = {
        id: Fingerprint.generate(publicKey),
        username: username,
        publicKey: publicKey,
        discriminator: null,
        color: generateColor(true),
        iat: Date.now()
    }

    let unique = false;

    for (let i = 0; i < 100; i++) {
        user.discriminator = Math.floor(Math.random() * 100);

        let name = `${user.username.toLowerCase()}#${user.discriminator}`;

        if (!guestsNames.has(name)) {
            unique = true;
            guestsNames.set(name, user.id);
            break;
        }
    }

    if (!unique) return false;

    // Create token
    return jwt.sign(user, process.env.TOKEN_SECRET);
}

/*
 *  Account login route
 */
export const authRoute = express.Router();
const logins = new Map();

authRoute.post("/login", async (req, res) => {
    let { username, publicKey } = req.body;

    if (typeof username !== "string" || typeof publicKey !== "string") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });

    if ( // Check if credentials are invalid
        username.length < 3 ||
        username.length > 16 ||
        username.replace(/[a-zA-Z0-9_]*/g, '').length > 0
    ) return res.status(400).json({
        error: true,
        message: "Invalid credentials",
        code: 501
    });

    // Generate session token
    let token = sessionToken(username, publicKey);

    if (token === false) return res.status(400).json({
        error: true,
        message: "Username has already been taken",
        code: 504
    });

    // Encrypt a random code for the user to verify
    let loginId = crypto.randomUUID();
    let code = crypto.randomBytes(256).toString("base64url");
    let encrypted;

    try {
        encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: code }),
            encryptionKeys: await openpgp.readKey({ armoredKey: publicKey })
        });
    } catch (error) {
        return res.status(400).json({
            error: true,
            message: "Invalid public key",
            code: 503
        });
    }

    // Create temporary login code
    logins.set(loginId, {
        token: token,
        code: code
    });

    setTimeout(() => {
        logins.delete(loginId);
    }, loginExpiration);
    
    res.status(200).json({
        id: loginId,
        message: encrypted
    });
});

authRoute.post("/verify/:id", (req, res) => {
    let { id } = req.params;
    let { message } = req.body;

    // Check if login id exists
    if (!logins.has(id)) return res.status(400).json({
        error: true,
        message: "Login code has expired",
        code: 505
    });

    let login = logins.get(id);

    // Check if code is valid
    if (message !== login.code) {
        res.status(400).json({
            error: true,
            message: "Login code is invalid",
            code: 506
        });
        logins.delete(id);
        return;
    }

    logins.delete(id);

    // Send user session token
    res.status(200).json({
        token: login.token
    });
});

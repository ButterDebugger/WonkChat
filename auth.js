import jwt from "jsonwebtoken";
import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import * as openpgp from "openpgp";
import { createUserSession, getPublicKey, getUserSession, setPublicKey, updateUserSession } from "./data.js";
import { Fingerprint } from "./identifier.js";
import { updateUserSubscribers } from "./streams.js";

let loginExpiration = 60_000; // 1 minute

/*
 *  Router middleware for authenticating a user's token stored in the cookies
 */
export async function authenticate(req, res, next) {
    let result = await verifyToken(req.headers["authorization"] || req.cookies["token"]);

    if (result.success) {
        req.user = result.user;
        next();
    } else {
        if (result.reset) {
            res.clearCookie("token");
        }

        res.status(400).json({
            error: true,
            message: "Invalid credentials",
            code: 501
        });
    }
}

export function verifyToken(token = null) {
    return new Promise((resolve) => {
        // Token cookie was not set
        if (typeof token !== "string") return resolve({
            success: false,
            reset: false,
            refresh: false,
            user: null
        });
    
        jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
            // Token is not valid
            if (err) return resolve({
                success: false,
                reset: false,
                refresh: false,
                user: null
            });

            // Check if token is too old
            if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14) return resolve({
                success: false,
                reset: true,
                refresh: false,
                user: null
            });

            // Check if public key is still available on the server
            if (await getPublicKey(user.id) === null) return resolve({
                success: false,
                reset: false,
                refresh: true,
                user: null
            });
            
            // Return the user
            resolve({
                success: true,
                reset: false,
                refresh: false,
                user: user
            });
        });
    });
}

function generateColor() {
    const randomInt = (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1) + min);

    let color = [ 255, randomInt(36, 255), randomInt(36, 162) ];

    for (let i = color.length - 1; i > 0; i--) { // Shuffle rgb color array
        let j = Math.floor(Math.random() * (i + 1));
        let temp = color[i];
        color[i] = color[j];
        color[j] = temp;
    }

    color = "#" + color.map(val => ("00" + val.toString(16)).slice(-2)).join(''); // Turn array into hex string
    
    return color;
}

async function sessionToken(username, id) {
    let userSession = await getUserSession(id);
    let user = {
        id: id,
        username: username,
        color: userSession?.color ?? generateColor(),
        iat: Date.now()
    };
    
    if (userSession !== null) {
        await updateUserSession(id, {
            username: user.username,
            color: user.color
        });
    }

    return {
        user: user,
        token: jwt.sign(user, process.env.TOKEN_SECRET) // Create token
    };
}

/*
 *  Account login route
 */
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: "Too many requests",
    legacyHeaders: true,
    standardHeaders: true,
    handler: (req, res, next, options) => {
        res.status(options.statusCode);
        res.json({
            error: true,
            message: options.message,
            code: 502
        });
    }
});

export const router = express.Router();
const logins = new Map();

router.use(authLimiter);

router.get("/logout", (req, res) => {
    res.clearCookie("token");

    res.status(200).json({
        success: true
    });
});

router.post("/login", async (req, res) => {
    let { username, publicKey } = req.body;

    if (typeof username !== "string" || typeof publicKey !== "string") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });

    // Check if credentials are invalid
    if (
        username.length < 3 ||
        username.length > 16 ||
        !/^(?! )[\x20-\x7E]{3,16}(?<! )$/g.test(username)
    ) return res.status(400).json({
        error: true,
        message: "Invalid credentials",
        code: 501
    });

    // Encrypt a random code for the user to verify
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
    let id = Fingerprint.generate(publicKey);
    let loginId = crypto.randomUUID();
    
    logins.set(loginId, {
        username: username,
        id: id,
        publicKey: publicKey,
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

router.post("/verify/:id", async (req, res) => {
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
    
    // Save public key
    await setPublicKey(login.id, login.publicKey);
    
    // Generate session token
    let { user, token } = await sessionToken(login.username, login.id);

    // Create the default session user and update subscribers 
    let userSession = await createUserSession(login.id, user.username, user.color);

    await updateUserSubscribers(login.id, userSession);

    // Send user session token
    res.status(200).json({
        id: login.id,
        token: token
    });
});

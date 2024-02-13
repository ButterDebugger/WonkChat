import jwt from "jsonwebtoken";
import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import path from "node:path";
import * as openpgp from "openpgp";
import { compareUserProfile, createUserProfile, getUserPublicKey, getUserSession, setUserPublicKey, updateUserProfile } from "./data.js";
import { Fingerprint, Snowflake } from "./identifier.js";
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
            if (await getUserPublicKey(user.username) === null) return resolve({
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

async function sessionToken(username) {
    let payload = {
        username: username,
        jti: crypto.randomUUID(),
        iat: Date.now()
    };

    return {
        payload: payload,
        token: jwt.sign(payload, process.env.TOKEN_SECRET) // Create token
    };
}

/*
 *  Account login router
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

// Authorization routes
export const authRouter = express.Router();
const logins = new Map();

authRouter.use("/signin", express.static(path.join(process.cwd(), "signin")));

authRouter.use(authLimiter);

// TODO: Add cors

authRouter.get("/logout", (req, res) => {
    res.clearCookie("token");

    res.status(200).json({
        success: true
    });
});

authRouter.post("/login", async (req, res) => {
    let { username, password } = req.body;

    if (typeof username !== "string" || typeof password !== "string") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });

    // Check if credentials are invalid
    if (
        username.length < 3 ||
        username.length > 16 ||
        !/^(?! )[\x20-\x7E]{3,16}(?<! )$/g.test(username) ||
        password.length < 6
    ) return res.status(400).json({
        error: true,
        message: "Invalid credentials",
        code: 501
    });

    // Generate a random nonce for the user to sign
    let nonce = crypto.randomBytes(256).toString("base64url");

    // Create a user account
    let color = generateColor();
    let success = await createUserProfile(username, password, color);

    if (success === null) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    // User account already exists
    if (success === false) {
        // Check if password is correct
        let correct = await compareUserProfile(username, password);

        if (!correct) return res.status(400).json({
            error: true,
            message: "Invalid credentials",
            code: 501
        });
    }


    // Create temporary login code
    logins.set(nonce, username);

    setTimeout(() => logins.delete(nonce), loginExpiration);
    
    res.status(200).json({
        success: true,
        nonce: nonce
    });
});

authRouter.post("/verify", async (req, res) => {
    let { signedNonce, publicKey } = req.body;

    if (typeof signedNonce !== "string" || typeof publicKey !== "string") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });

    // Verify the signed nonce
    let nonce;
    let armoredKey;

    try {
        armoredKey = await openpgp.readKey({ armoredKey: publicKey });
        let { data } = await openpgp.verify({
            message: await openpgp.readMessage({ armoredMessage: signedNonce }),
            verificationKeys: armoredKey
        });
        nonce = data;
    } catch (error) {
        return res.status(400).json({
            error: true,
            message: "Invalid public key",
            code: 503
        });
    }

    // Check if login nonce exists
    if (!logins.has(nonce)) return res.status(400).json({
        error: true,
        message: "Login code has expired",
        code: 505
    });

    let username = logins.get(nonce);

    logins.delete(nonce);
    
    // Generate session token
    let { token } = await sessionToken(username);

    // Check if the user profile exists 
    let user = await getUserSession(username);

    if (user === null) return res.status(400).json({
        error: true,
        message: "Account does not exist",
        code: 507
    });
    
    // Save public key
    let success = await setUserPublicKey(username, armoredKey.write());

    if (!success) return res.status(500).json({
        error: true,
        message: "Internal server error",
        code: 106
    });

    // Update subscribers
    let userSession = await getUserSession(username);

    await updateUserSubscribers(username, userSession);

    // Send the session token
    res.status(200).json({
        success: true,
        token: token
    });
});

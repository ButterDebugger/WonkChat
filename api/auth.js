import jwt from "jsonwebtoken";
import { createUserSession } from "../storage/data.js";
import { generateId } from "../storage/snowflake.js";

let guestsNames = new Map();

/**
 * Router middleware for authenticating a user's token stored in the cookies
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

function checkAccount(username, password) { // TODO: check for an account
    return false;
}

export function sessionToken(username, password = null) {
    let isGuest = password === null;
    let user = {
        id: generateId(0n),
        username: username,
        guest: isGuest,
        password: password,
        discriminator: null,
        color: generateColor(isGuest),
        iat: Date.now()
    }

    if (isGuest) {
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
    } else {
        let account = checkAccount(username, password);
        if (typeof account !== "object") return false;

        user = Object.assign(user, account);
    }

    // Create token
    return jwt.sign(user, process.env.TOKEN_SECRET);
}

export function authRoute(req, res) {
    let { username, password, isGuest } = req.body;

    if (typeof username !== "string" || typeof password !== "string" || typeof isGuest !== "boolean") return res.status(400).json({
        error: true,
        message: "Invalid body",
        code: 101
    });
    
    if (isGuest) { // User is a guest
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
        let token = sessionToken(username);

        if (token === false) return res.status(400).json({
            error: true,
            message: "Invalid credentials",
            code: 501
        });
        
        res.status(200).json({
            token: token
        });
    } else { // User has an account
        if ( // Check if credentials are invalid
            username.length < 3 ||
            username.length > 16 ||
            password.length < 8 ||
            username.replace(/[a-zA-Z0-9_]*/g, '').length > 0
        ) return res.status(400).json({
            error: true,
            message: "Invalid credentials",
            code: 501
        });

        // Generate session token
        let token = sessionToken(username, password);

        if (token === false) return res.status(400).json({
            error: true,
            message: "Invalid credentials",
            code: 501
        });
        
        res.status(200).json({
            token: token
        });
    }
}

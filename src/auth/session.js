import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { token_secret } from "../lib/config.js";

/**
 * Router middleware for authenticating a user's token stored in the headers
 */
export async function authenticateMiddleware(req, res, next) {
	let payload = await authenticateRequest(req);

	if (payload === null) {
		// TODO: respond with a different error if the session token has expired
		res.status(400).json({
			error: true,
			message: "Invalid credentials",
			code: 501
		});
	} else {
		req.user = payload;
		next();
	}
}

/**
 * Authenticates a user's request
 * @returns {null | object} Token payload
 */
export async function authenticateRequest(req) {
	let authHeader = req.headers["authorization"];
	let wsProtocol = req.headers["sec-websocket-protocol"];

	// Retrieve the token from the request headers
	let token;

	if (typeof authHeader == "string") {
		let match = authHeader.match(/Bearer (.*)/);

		// Authorization header does not match the expected format
		if (match === null) return null;

		token = match[1];
	} else if (typeof wsProtocol == "string") {
		let args = wsProtocol.split(/, ?/g);
		let authIndex = args.indexOf("Authorization");

		// Authorization isn't in the websocket protocol or the token is missing
		if (authIndex == -1 || authIndex + 1 >= args.length) return null;

		token = args[authIndex + 1];
	} else return null;

	// Verify the token and return the payload
	return await verifyToken(token);
}

/**
 * @returns {null | object} Token payload
 */
function verifyToken(token = null) {
	return new Promise((resolve) => {
		// A token was not provided
		if (typeof token !== "string") return resolve(null);

		jwt.verify(token, token_secret, async (err, user) => {
			// Token is not valid
			if (err) return resolve(null);

			// Check if token is too old
			if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14)
				return resolve(null);

			// Return the user
			resolve(user);
		});
	});
}

export function generateColor() {
	const randomInt = (min = 0, max = 1) =>
		Math.floor(Math.random() * (max - min + 1) + min);

	let color = [255, randomInt(36, 255), randomInt(36, 162)];

	for (let i = color.length - 1; i > 0; i--) {
		// Shuffle rgb color array
		let j = Math.floor(Math.random() * (i + 1));
		let temp = color[i];
		color[i] = color[j];
		color[j] = temp;
	}

	color =
		"#" + color.map((val) => ("00" + val.toString(16)).slice(-2)).join(""); // Turn array into hex string

	return color;
}

export async function sessionToken(username) {
	let payload = {
		username: username,
		jti: crypto.randomUUID(),
		iat: Date.now()
	};

	return {
		payload: payload,
		token: jwt.sign(payload, token_secret) // Create token
	};
}

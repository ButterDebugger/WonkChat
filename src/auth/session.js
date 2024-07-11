import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getUserPublicKey } from "../lib/data.js";
import { token_secret } from "../lib/config.js";

/*
 *  Router middleware for authenticating a user's token stored in the cookies
 */
export async function authenticate(req, res, next) {
	let result = await verifyToken(
		req.headers["authorization"] || req.cookies["token"]
	);

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
		if (typeof token !== "string")
			return resolve({
				success: false,
				reset: false,
				user: null
			});

		jwt.verify(token, token_secret, async (err, user) => {
			// Token is not valid
			if (err)
				return resolve({
					success: false,
					reset: false,
					user: null
				});

			// Check if token is too old
			if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14)
				return resolve({
					success: false,
					reset: true,
					user: null
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

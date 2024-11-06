import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import path from "node:path";
import { generateColor, sessionToken } from "./session.js";
import { compareUserProfile, createUserProfile } from "../lib/data.js";

export const router = express.Router();

const accessUsers = new Map();
const accessExpiration = 60_000; // 1 minute
const rateLimiter = rateLimit({
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
			code: 502,
		});
	},
});

router.use("/login", express.static(path.join(process.cwd(), "public")));

router.use(rateLimiter);

router.post("/token", (req, res) => {
	const { verifier } = req.body;

	if (typeof verifier !== "string")
		return res.status(400).json({
			error: true,
			message: "Invalid body",
			code: 101,
		});

	// Hash verifier
	const challenge = crypto
		.createHash("sha256")
		.update(verifier)
		.digest("base64url");

	if (!accessUsers.has(challenge)) {
		return res.status(400).json({
			error: true,
			message: "Invalid verifier",
			code: 501,
		});
	}

	// Return token to the user
	const token = accessUsers.get(challenge);
	accessUsers.delete(challenge);

	res.status(200).json({
		success: true,
		token: token,
	});
});
router.post("/authorize", async (req, res) => {
	const { username, password, challenge } = req.body;

	if (
		typeof username !== "string" ||
		typeof password !== "string" ||
		typeof challenge !== "string"
	)
		return res.status(400).json({
			error: true,
			message: "Invalid body",
			code: 101,
		});

	// Check if credentials are invalid
	if (!/^(?! )[\x20-\x7E]{3,16}(?<! )$/g.test(username) || password.length < 6)
		return res.status(400).json({
			error: true,
			message: "Invalid credentials",
			code: 501,
		});

	// Create a user account
	const color = generateColor();
	const success = await createUserProfile(username, password, color);

	if (success === null)
		return res.status(500).json({
			error: true,
			message: "Internal server error",
			code: 106,
		});

	// User account already exists
	if (success === false) {
		// Check if password is correct
		const correct = await compareUserProfile(username, password);

		if (!correct)
			return res.status(400).json({
				error: true,
				message: "Invalid credentials",
				code: 501,
			});
	}

	// Store access token
	accessUsers.set(challenge, (await sessionToken(username)).token);
	setTimeout(() => accessUsers.delete(challenge), accessExpiration);

	res.status(200).json({
		success: true,
	});
});

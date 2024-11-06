import express from "express";
import crypto from "node:crypto";
import * as openpgp from "openpgp";
import { setUserPublicKey } from "./lib/data.js";
import { authenticateHandler } from "./auth/session.js";

export const router = express.Router();

// TODO: add a cooldown for changing the public key

// User ids ~> Nonce
const nonces = new Map();

router.get("/nonce", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	// Generate a random nonce for the user to sign
	const nonce = crypto.randomBytes(256).toString("base64url");

	// Create temporary login code
	nonces.set(tokenPayload.username, nonce);

	// setTimeout(() => logins.delete(nonce), loginExpiration); // TODO: readd the expiration

	res.status(200).json({
		success: true,
		nonce: nonce,
	});
});
router.post("/verify", async (req, res) => {
	const tokenPayload = await authenticateHandler(req, res);
	if (tokenPayload === null) return;

	const { signedNonce, publicKey } = req.body;

	if (typeof signedNonce !== "string" || typeof publicKey !== "string")
		return res.status(400).json({
			error: true,
			message: "Invalid body",
			code: 101,
		});

	// Check if login nonce exists
	if (!nonces.has(tokenPayload.username))
		return res.status(400).json({
			error: true,
			message: "Nonce has expired",
			code: 505,
		});

	// Verify the signed nonce
	let unsignedNonce: object;
	let armoredKey: openpgp.Key;

	try {
		armoredKey = await openpgp.readKey({ armoredKey: publicKey });
		const { data } = await openpgp.verify({
			message: await openpgp.readMessage({
				armoredMessage: signedNonce,
			}),
			verificationKeys: armoredKey,
		});
		unsignedNonce = data;
	} catch (error) {
		return res.status(400).json({
			error: true,
			message: "Invalid public key",
			code: 503,
		});
	}

	// Match the nonce
	const nonce = nonces.get(tokenPayload.username);
	nonces.delete(tokenPayload.username);

	if (unsignedNonce !== nonce)
		return res.status(400).json({
			error: true,
			// TODO: write an error message
		});

	// Save public key
	const success = await setUserPublicKey(
		tokenPayload.username,
		armoredKey.write(),
	);

	if (!success)
		return res.status(500).json({
			error: true,
			message: "Internal server error",
			code: 106,
		});

	res.status(200).json({
		success: true,
	});
});

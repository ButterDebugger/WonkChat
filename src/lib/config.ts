import crypto from "node:crypto";
import type { Secret } from "jsonwebtoken";

export const port = process.env.PORT ?? 5000;
export const token_secret: Secret =
	process.env.TOKEN_SECRET ?? crypto.randomBytes(64).toString("hex");
export const namespace = process.env.NAMESPACE;

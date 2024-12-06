import crypto from "node:crypto";
import type { SignatureKey } from "hono/utils/jwt/jws";

export const port: number = Number(Deno.env.get("PORT") ?? 5000);
export const token_secret: SignatureKey =
	Deno.env.get("TOKEN_SECRET") ?? crypto.randomBytes(64).toString("hex");
export const namespace = Deno.env.get("NAMESPACE");
export const database_url: string = <string>Deno.env.get("DATABASE_URL");

if (!database_url) throw new Error("DATABASE_URL is not set");

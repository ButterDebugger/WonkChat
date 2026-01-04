import crypto from "node:crypto";
import type { SignatureKey } from "hono/utils/jwt/jws";

export const port: number = Number(Bun.env.PORT ?? 5000);
export const token_secret: SignatureKey =
	Bun.env.TOKEN_SECRET ?? crypto.randomBytes(64).toString("hex");
export const namespace: string = <string>Bun.env.NAMESPACE;
export const homeserver_url = Bun.env.HOMESERVER_URL;

if (!namespace) throw new Error("NAMESPACE is not set");

// Database config

export const database_url: string = <string>Bun.env.DATABASE_URL;
export const database_sync_url: string = <string>Bun.env.DATABASE_SYNC_URL;
export const database_auth_token: string = <string>Bun.env.DATABASE_AUTH_TOKEN;

if (!database_url) throw new Error("DATABASE_URL is not set");

// Since Bun automatically reads the S3 credentials from the environment,
// We only need to check if the endpoint is set
// https://bun.com/docs/runtime/s3#credentials

if (!Bun.env.S3_ENDPOINT) throw new Error("S3_ENDPOINT is not set");
if (!Bun.env.S3_BUCKET) throw new Error("S3_BUCKET is not set");
if (!Bun.env.S3_SECRET_ACCESS_KEY) throw new Error("S3_SECRET_ACCESS_KEY is not set");
if (!Bun.env.S3_ACCESS_KEY_ID) throw new Error("S3_ACCESS_KEY_ID is not set");

// Media config

export const maxChunkSize = 1024 * 1024; // 1 MB; TODO: make this a configurable constant

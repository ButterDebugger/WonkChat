import crypto from "node:crypto";
import type { SignatureKey } from "hono/utils/jwt/jws";

export const port: number = Number(Bun.env.PORT ?? 5000);

export const token_secret: SignatureKey =
	Bun.env.TOKEN_SECRET ?? crypto.randomBytes(64).toString("hex");

export const namespace = Bun.env.NAMESPACE;
if (!namespace) throw new Error("NAMESPACE is not set");

export const homeserver_url = Bun.env.HOMESERVER_URL;

export const database_url: string = <string>Bun.env.DATABASE_URL;
if (!database_url) throw new Error("DATABASE_URL is not set");

export const database_sync_url: string = <string>Bun.env.DATABASE_SYNC_URL;

export const database_auth_token: string = <string>Bun.env.DATABASE_AUTH_TOKEN;


import fetch from "./fetch.ts";
import type { SessionEnv } from "../auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";

export const router = new OpenAPIHono<SessionEnv>();

router.route("/", fetch);

import { OpenAPIHono } from "@hono/zod-openapi";
import { SessionEnv } from "../auth/session.ts";
import { router as keyRoute } from "./publickey.ts";
import { router as infoRoute } from "./info.ts";

export const router = new OpenAPIHono<SessionEnv>();

router.route("/publickey", keyRoute);
router.route("/info", infoRoute);

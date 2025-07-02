import { OpenAPIHono } from "@hono/zod-openapi";
import { SessionEnv } from "../auth/session.ts";
import { router as uploadRoute } from "./upload.ts";
import { router as getRoute } from "./get.ts";

export const router = new OpenAPIHono<SessionEnv>();

router.route("/upload", uploadRoute);
router.route("/", getRoute);

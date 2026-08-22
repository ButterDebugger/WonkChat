import { OpenAPIHono } from "@hono/zod-openapi";
import type { SessionEnv } from "./session.ts";

const router = new OpenAPIHono<SessionEnv>();

router.get("/", (ctx) => {
	const { callback, challenge, state } = ctx.req.query();

	return ctx.redirect(
		`/oauth/login?callback=${encodeURIComponent(callback)}&challenge=${encodeURIComponent(challenge)}&state=${encodeURIComponent(state)}`,
		302,
	);
});

export default router;

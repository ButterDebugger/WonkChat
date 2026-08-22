import { router as roomRoute } from "./channels/room.ts";
import { router as usersRoute } from "./users/user.ts";
import { namespace } from "../lib/config.ts";
import { router as authRoute } from "./auth/auth.ts";
import { route as streamRoute } from "../sockets.ts";
import { router as mediaRoute } from "./media/media.ts";
import { router as meRoute } from "./me/me.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import { WsSessionHeadersSchema } from "../lib/validation.ts";
import type { Handler } from "hono/types";
import { invalidateOldUploads } from "./media/upload.ts";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import type { WSData } from "../types.ts";
import { prettyJSON } from "hono/pretty-json";

export const router = new OpenAPIHono<SessionEnv>();
export const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket<WSData>>();

// Add middleware
router.use(prettyJSON());

// Add info route
router.get("/", (ctx) => {
	return ctx.json(
		{
			namespace: namespace,
			openapi: "/openapi.json",
			scalar: "/scalar",
		},
		200,
	);
});

// Ping route
router.get("/ping", (ctx) => {
	return ctx.json(
		{
			message: "Pong!",
			success: true,
		},
		200,
	);
});

// Initialize stream route
router.openapi(
	{
		method: "get",
		path: "/stream",
		middleware: [authMiddleware] as const,
		request: {
			headers: WsSessionHeadersSchema,
		},
		responses: {
			101: {
				description: "Success message",
			},
		},
	},
	upgradeWebSocket(streamRoute) as unknown as Handler<SessionEnv>,
);

// Auth routes
router.route("/auth", authRoute);

// Room routes
router.route("/room", roomRoute);

// User routes
router.route("/user", usersRoute);

// Me routes
router.route("/me", meRoute);

// Media routes
router.route("/media", mediaRoute);
invalidateOldUploads();

// Unknown endpoint handler
router.all("*", (ctx) => {
	return ctx.json(
		{
			success: false,
			message: "Unknown endpoint",
			code: 105,
		},
		400,
	);
});

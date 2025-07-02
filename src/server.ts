import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import {
	router as attachmentsRoute,
	clean as cleanAttachments
} from "./attachments.ts";
import chalk from "chalk";
import { router as roomRoute } from "./channels/room.ts";
import { router as usersRoute } from "./users/user.ts";
import { createRoom } from "./lib/data.ts";
import { namespace, port } from "./lib/config.ts";
import { router as oauthRoute } from "./auth/oauth.ts";
import { route as streamRoute } from "./sockets.ts";
// import { router as mediaRoute } from "./media/media.ts";
import { router as meRoute } from "./me/me.ts";
import { authMiddleware, type SessionEnv } from "./auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { WsSessionHeadersSchema } from "./lib/validation.ts";
import type { Handler } from "hono/types";
import { WSData } from "./types.ts";

const app = new OpenAPIHono<SessionEnv>();
const { upgradeWebSocket, websocket } =
	createBunWebSocket<ServerWebSocket<WSData>>();

// Initialize stream route
app.openapi(
	{
		method: "get",
		path: "/stream",
		middleware: [authMiddleware] as const,
		request: {
			headers: WsSessionHeadersSchema
		},
		responses: {
			101: {
				description: "Success message"
			}
		}
	},
	upgradeWebSocket(streamRoute) as unknown as Handler<SessionEnv>
);

// Add middleware
app.use(prettyJSON());
app.use(trimTrailingSlash());
app.use(cors());

// Add info route
app.get("/", (ctx) => {
	return ctx.json(
		{
			namespace: namespace,
			openapi: "/doc",
			scalar: "/scalar"
		},
		200
	);
});

// Ping route
app.get("/ping", (ctx) => {
	return ctx.json(
		{
			message: "Pong!",
			success: true
		},
		200
	);
});

// Auth routes
app.route("/oauth", oauthRoute);

// Room routes
app.route("/room", roomRoute);

// User routes
app.route("/", usersRoute);

// Me routes
app.route("/me", meRoute);

// Clear attachments folder and handle attachments route
app.route("/", attachmentsRoute);
cleanAttachments();

// app.route("/media", mediaRoute); // TODO: finish implementing this

// Create starting room
createRoom("wonk", "Welcome to Wonk Chat!");

// Create OpenAPI route and Scalar explorer
app.get(
	"/scalar",
	Scalar({
		url: "/doc",
		theme: "elysiajs"
	})
);

app.doc31("/doc", {
	openapi: "3.1.0",
	info: {
		version: "1.2.0",
		title: "Wonk Chat"
	}
});

// Unknown endpoint handler
app.all((ctx) => {
	return ctx.json(
		{
			success: false,
			message: "Unknown endpoint",
			code: 105
		},
		400
	);
});

Bun.serve({
	port: port,
	fetch: app.fetch,
	websocket,
	error(error) {
		console.error(
			chalk.bgRed.bold(" ERROR "),
			chalk.white("API server has encountered an error:"),
			error
		);
		return new Response("500 Internal server error", {
			status: 500
		});
	}
});

console.log(
	chalk.bgGreen.bold(" LISTENING "),
	chalk.white(`API server is running on port ${port}`)
);

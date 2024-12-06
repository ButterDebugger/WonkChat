import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import {
	router as attachmentsRoute,
	clean as cleanAttachments,
} from "./attachments.ts";
import chalk from "chalk";
import { router as gatewayRoute } from "./gateway.ts";
import { createRoom } from "./lib/data.ts";
import { namespace, port } from "./lib/config.ts";
import { router as oauthRoute } from "./auth/oauth.ts";
import { router as keysRoute } from "./keys.ts";
import { route as streamRoute } from "./sockets.ts";
import { authMiddleware } from "./auth/session.ts";

const app = new Hono();

// Initialize stream route
app.get("/stream", authMiddleware, streamRoute);

// Add middleware
app.use(prettyJSON());
app.use(trimTrailingSlash());
app.use(cors());

// Add info route
app.get("/", (ctx) => {
	return ctx.json(
		{
			namespace: namespace,
		},
		200,
	);
});

// Ping route
app.get("/ping", (ctx) => {
	return ctx.json(
		{
			message: "Pong!",
			success: true,
		},
		200,
	);
});

// Auth routes
app.route("/oauth", oauthRoute);

// Key exchange routes
app.route("/keys", keysRoute);

// Handle api gateway
app.route("/", gatewayRoute);

// Clear attachments folder and handle attachments route
app.route("/", attachmentsRoute);
cleanAttachments();

// Create starting room
createRoom("wonk", "Welcome to Wonk Chat!");

// Unknown endpoint handler
app.all((ctx) => {
	return ctx.json(
		{
			error: true,
			message: "Unknown endpoint",
			code: 105,
		},
		400,
	);
});

Deno.serve(
	{
		port: port,
		onListen: () => {
			console.log(
				chalk.bgGreen.bold(" LISTENING "),
				chalk.white(`API server is running on port ${port}`),
			);
		},
		onError: (err) => {
			console.error(
				chalk.bgRed.bold(" ERROR "),
				chalk.white("API server has encountered an error:"),
				err,
			);
			return new Response("500 Internal server error", {
				status: 500,
			});
		},
	},
	app.fetch,
);

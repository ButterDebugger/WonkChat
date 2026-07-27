import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import { serveStatic } from "hono/bun";
import chalk from "chalk";
import { router as apiRoute, websocket } from "./api/api.ts";
import { homeserver_url, maxChunkSize, port } from "./lib/config.ts";
import { type SessionEnv } from "./api/auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { invalidateOldUploads } from "./api/media/upload.ts";

const app = new OpenAPIHono<SessionEnv>();

// Add middleware
app.use(prettyJSON());
app.use(trimTrailingSlash());
app.use(cors());

// Add api routes
app.route("/api", apiRoute);

// Add well-known route
if (homeserver_url)
	app.get("/.well-known/wonk", (ctx) => {
		return ctx.json(
			{
				homeserver: {
					base_url: homeserver_url,
				},
			},
			200,
		);
	});

// Create OpenAPI route and Scalar explorer
app.get(
	"/scalar",
	Scalar({
		url: "/doc",
		theme: "elysiajs",
	}),
);

app.doc31("/doc", {
	openapi: "3.1.0",
	info: {
		version: "1.3.0",
		title: "Wonk Chat",
	},
});

// Serve static assets
app.get("/*", serveStatic({ root: "dist" }));

// Fallback to index.html
app.get("/*", serveStatic({ path: "./dist/index.html" }));

Bun.serve({
	port: port,
	fetch: app.fetch,
	websocket,
	error(error) {
		console.error(
			chalk.bgRed.bold(" ERROR "),
			chalk.white("API server has encountered an error:"),
			error,
		);
		return new Response("500 Internal server error", {
			status: 500,
		});
	},
	maxRequestBodySize: Math.max(
		1024 * 1024 * 128, // 128MB
		maxChunkSize + 1, // NOTE: not sure the plus 1 is necessary, would have to check with Bun's source code
	),
});

console.log(
	chalk.bgGreen.bold(" LISTENING "),
	chalk.white(`API server is running on port ${port}`),
);

// Every 5 minutes, clean up any expired data
setInterval(
	() => {
		invalidateOldUploads();
	},
	1000 * 60 * 5,
);

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import {
	router as attachmentsRoute,
	clean as cleanAttachments
} from "./attachments.js";
import chalk from "chalk";
import http from "node:http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { router as gatewayRoute } from "./gateway.js";
import { createRoom, initTables } from "./lib/data.js";
import { namespace, port } from "./lib/config.js";
import { router as oauthRoute } from "./auth/oauth.js";
import { router as keysRoute } from "./keys.js";
import initStream from "./sockets.js";

initTables();

const app = express();
const server = http.createServer({}, app).listen(port);
const wssStream = new WebSocketServer({ server: server, path: "/stream" });

// Add server log listeners
server.addListener("listening", () => {
	console.log(
		chalk.bgGreen.bold(" LISTENING "),
		chalk.white(`API server is running on port ${port}`)
	);
});
server.addListener("close", () => {
	console.log(
		chalk.bgYellow.bold(" CLOSE "),
		chalk.white("API server has closed")
	);
});
server.addListener("error", (err) => {
	console.error(
		chalk.bgRed.bold(" ERROR "),
		chalk.white("API server has encountered an error:"),
		err
	);
});

// Add middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());

// Configure express
app.set("trust proxy", 1);

// Add info route
app.get("/", (req, res) => {
	res.status(200).json({
		namespace: namespace
	});
});

// Ping route
app.get("/ping", (req, res) => {
	res.status(200).json({
		message: "Pong!",
		success: true
	});
});

// Auth routes
app.use("/oauth", oauthRoute);

// Key exchange routes
app.use("/keys", keysRoute);

// Handle api gateway
app.use(gatewayRoute);

// Initialize stream route
initStream(wssStream);

// Clear attachments folder and handle attachments route
app.use(attachmentsRoute);
cleanAttachments();

// Create starting room
createRoom("wonk", "Welcome to Wonk Chat!");

// Unknown endpoint handler
app.use((req, res, next) => {
	res.status(400).json({
		error: true,
		message: "Unknown endpoint",
		code: 105
	});
});

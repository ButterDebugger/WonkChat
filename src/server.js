import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import {
	router as attachmentsRoute,
	clean as cleanAttachments
} from "./attachments.js";
import { getStreamRoute } from "./streams.js";
import chalk from "chalk";
import http from "node:http";
import cors from "cors";
import { authRouter, authenticate } from "./auth.js";
import { router as gatewayRoute } from "./gateway.js";
import { createRoom } from "./data.js";

const port = process.env.PORT ?? 5001;
const app = express();
const server = http.createServer({}, app).listen(port);

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

// Ping route
app.get("/ping", (req, res) => {
	res.status(200).json({
		message: "Pong!",
		success: true
	});
});

// Auth routes
app.use("/auth", authRouter);

// Handle api gateway
app.use(authenticate, gatewayRoute);

// Handle stream route
app.get("/stream", authenticate, getStreamRoute);

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

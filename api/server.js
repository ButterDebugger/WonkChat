import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "node:path";
import chalk from "chalk";
import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import { authRoute } from "./auth.js";
import gateway from "./gateway.js";

dotenv.config();
const app = express();
const server = http.createServer({}, app).listen(5000);

// Add server log listeners
server.addListener("listening", () => {
    console.log(chalk.bgGreen.bold(" LISTENING "), chalk.white(`Running on port ${port}`));
});
server.addListener("close", () => {
    console.log(chalk.bgYellow.bold(" CLOSE "), chalk.white("Server has closed"));
});
server.addListener("error", (err) => {
    console.error(chalk.bgRed.bold(" ERROR "), chalk.white("Server has encountered an error:"), err);
});

// Add middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());

// Login routes
app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// Auth routes
app.use("/auth", authRoute);

// Handle api gateway
gateway(app);

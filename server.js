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
const port = process.env.PORT ?? 5000;
const app = express();
const server = http.createServer({}, app).listen(port);

// Add server log listeners
server.addListener("listening", () => {
    console.log(chalk.bgGreen.bold(" LISTENING "), chalk.white(`API server is running`));
});
server.addListener("close", () => {
    console.log(chalk.bgYellow.bold(" CLOSE "), chalk.white("API server has closed"));
});
server.addListener("error", (err) => {
    console.error(chalk.bgRed.bold(" ERROR "), chalk.white("API server has encountered an error:"), err);
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

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs/promises";
import cors from "cors";
import dotenv from "dotenv";
import { authRoute, authenticate } from "./api/auth.js";
import gateway from "./api/gateway.js";
import start from "./lib/start.js";

dotenv.config();
const ssl = false;
const port = process.env.PORT ?? (ssl ? 443 : 8080);

const app = express();
start(app, port, ssl ? {
    ssl: true,
    config: {
        cert: await fs.readFile("./ssl/cert.pem"),
        key: await fs.readFile("./ssl/key.pem")
    }
} : {});

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

// App routes
app.use("/app", authenticate);
app.use(express.static(path.join(process.cwd(), "public"), {
    extensions: ['html', 'htm']
}));

// Handle api gateway
gateway(app);

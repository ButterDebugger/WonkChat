import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "node:path";
import http from "node:http";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { authRoute, authenticate } from "./api/auth.js";
import gateway from "./api/gateway.js";
import start from "./lib/start.js";

dotenv.config();
const port = process.env.PORT ?? 8080;

const app = express();
const server = start(app, port, {}); // Start the server

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // limit each IP to 1000 requests per windowMs
    message: "Too many requests",
    legacyHeaders: true,
    standardHeaders: true,
    handler: (req, res, next, options) => {
        res.status(options.statusCode);
        res.json({
            error: true,
            message: options.message,
            code: 502
        });
    }
});

// Add middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.set("allow", "*");
    next();
});

// Login routes
app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// Auth routes
app.post("/api/auth", authLimiter, authRoute);

// App routes
app.get("/", (req, res) => {
    res.redirect("/app");
});
app.use("/app", authenticate);
app.use(express.static(path.join(process.cwd(), "public"), {
    extensions: ['html', 'htm']
}));

// Handle api gateway
gateway(app);

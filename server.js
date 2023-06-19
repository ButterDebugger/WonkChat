import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "node:path";
import http from "node:http";
import dotenv from "dotenv";
import { authRoute, authenticate } from "./api/auth.js";
import gateway from "./api/gateway.js";

dotenv.config();
const port = process.env.PORT ?? 8080;

const app = express();
const server = http.Server(app);

// Add middleware
app.use(compression());
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
app.post("/auth", authRoute);

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

// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

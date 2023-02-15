import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server as socketServer } from "socket.io";
import path from "node:path";
import http from "node:http";
import dotenv from "dotenv";
import { authenticateToken, sessionToken } from "./auth.js";
import attachments from "./attachments.js";
import sockets from "./sockets.js";

dotenv.config();
const nameRegex = /[a-zA-Z0-9_]*/g;
const port = process.env.PORT ?? 8080;

const app = express();
const server = http.Server(app);
const io = new socketServer(server);

// Add middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
	console.log("url", req.url)
	next();
})

// App routes
app.get("/", (req, res) => {
	res.redirect("/app");
});
app.use("/app", authenticateToken);
app.use(express.static(path.join(process.cwd(), "public"), {
	extensions: ['html', 'htm']
}));

// Login routes
app.get("/logout", (req, res) => {
	res.clearCookie("token");
	res.redirect("/login");
});

// Auth routes
app.post("/auth", (req, res) => {
	var { username, password } = req.body;

	if (typeof username !== "string" || typeof password !== "string") return res.status(400).end();
	
	// Check if username and password is acceptable
	if (
		username.length < 3 ||
		username.length > 16 ||
		password.length < 8 ||
		username.replace(nameRegex, '').length > 0
	) {
		res.redirect("/login");
		return;
	}

	// Create session token
	res.cookie("token", sessionToken(username, password));

	// Redirect user back to index
	res.redirect("/");
});
app.get("/auth", (req, res) => {
	res.redirect("/login");
});

// Create socket server
sockets(io);

// Handle attachments
app.use(attachments.router);
attachments.clean();

// Start the server
server.listen(port, () => {
	console.log(`Server is running on port ${port}`)
});

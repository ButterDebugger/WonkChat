import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server as socketServer } from "socket.io";
import path from "node:path";
import http from "node:http";
import dotenv from "dotenv";
import { authenticate, sessionToken } from "./auth.js";
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

// App routes
app.get("/", (req, res) => {
	res.redirect("/app");
});
app.use("/app", authenticate);
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
	let { username, haspassword, password } = req.body;

	haspassword ??= "off";

	if (typeof username !== "string" || typeof haspassword !== "string" || typeof password !== "string") {
		if (req.accepts("text/html")) {
			res.redirect("/login");
		} else {
			res.status(400).end();
		}
		return;
	}

	haspassword = haspassword === "on" ? true : false;
	
	if (!haspassword) { // User is a guest
		if ( // Check if username is valid
			username.length < 3 ||
			username.length > 16 ||
			username.replace(nameRegex, '').length > 0
		) { // Credentials are invalid
			if (req.accepts("text/html")) {
				res.redirect("/login");
			} else {
				res.status(400).end();
			}
		} else { // Generate session token
			res.cookie("token", sessionToken(username));
			res.redirect("/");
		}
	} else { // User has an account
		if ( // Check if username and password is valid
			username.length < 3 ||
			username.length > 16 ||
			password.length < 8 ||
			username.replace(nameRegex, '').length > 0
		) { // Credentials are invalid
			if (req.accepts("text/html")) {
				res.redirect("/login");
			} else {
				res.status(400).end();
			}
		} else { // Generate session token
			res.cookie("token", sessionToken(username, password));
			res.redirect("/");
		}
	}
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

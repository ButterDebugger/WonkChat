const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const ssl = require("./ssl.js");
const { authenticateToken, sessionToken } = require("./auth.js");
const { nameRegex } = require("./config.js")();

const app = express();
// const server = require("http").Server(app);
const server = ssl.secure(app);
const io = require("socket.io")(server);

// Add middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", "views");
app.set("view engine", "ejs");

// App routes
app.get("/", (req, res) => {
	res.redirect("/app");
});
app.use("/app", authenticateToken);
app.use(express.static(path.join(__dirname, "public")));

// Login routes
app.get("/signin", (req, res) => {
	res.render("signin", {
		reason: ""
	})
});
app.get("/logout", (req, res) => {
	res.clearCookie("token");
	res.render("signin", {
		reason: "You have been logged out."
	});
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
		res.render("signin", {
			reason: "You have provided bad credentials."
		});
		return;
	}

	// Create session token
	res.cookie("token", sessionToken(username, password));

	// Redirect user back to index
	res.redirect("/");
});
app.get("/auth", (req, res) => {
	res.redirect("/signin");
});

require("./socketServer.js")(io);
const attachments = require("./attachments.js");

app.use(attachments.router);

attachments.clear();

// Start the server
/*server.listen(process.env.PORT, () => {
	console.log(`Server is running on port ${process.env.PORT}`)
});*/

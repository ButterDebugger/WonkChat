const jwt = require("jsonwebtoken");
const seedrandom = require("seedrandom");

async function authenticateToken(req, res, next) {
	var result = await verifyToken(req.cookies["token"]);

	if (result.success) {
		req.user = result.user;
		next();
	} else {
		if (result.clearToken) {
			res.clearCookie("token");
		}

		res.render("signin", {
			reason: result.reason
		});
	}
}

function verifyToken(token) {
	return new Promise((resolve) => {
		if (!token) { // Token cookie is not set
			resolve({
				success: false,
				reason: "Please sign in before continuing.",
				clearToken: false,
				user: null
			});
			return;
		}
	
		jwt.verify(token, process.env.TOKEN_SECRETE, (err, user) => {
			if (err) { // Token is not valid
				resolve({
					success: false,
					reason: "Your previous token does not work anymore.",
					clearToken: false,
					user: null
				});
				return;
			}
	
			// Check if token is stale ( not "good" )
			if (Date.now() - user.iat > 1000 * 60 * 60 * 24 * 14) {
				resolve({
					success: false,
					reason: "Your previous session has been timed out.",
					clearToken: true,
					user: null
				});
				return;
			}
			
			resolve({
				success: true,
				reason: null,
				clearToken: false,
				user: user
			});
		});
	});
}

function sessionToken(username, password) {
	const rng = new seedrandom(`${username}/${password}/${process.env.USER_SALT}`);
	const hexChars = "0123456789abcdef";

	// Generate unique id
	let id = "";
	for (var i = 0; i < 24; i++) {
		id += hexChars.charAt(Math.floor(rng() * hexChars.length));
	}

	// Generate color
	let color = "#";
	for (var i = 0; i < 6; i++) {
		color += hexChars.charAt(Math.floor(rng() * hexChars.length));
	}

	// Generate discriminator
	var discriminator = Math.floor(rng() * 100);

	// Create token
	var user = {
		username: username,
		password: password,
		id: id,
		color: color,
		discriminator: discriminator,
		iat: Date.now()
	};
	var token = jwt.sign(user, process.env.TOKEN_SECRETE);

	return token;
}

module.exports = {
    authenticateToken,
    verifyToken,
	sessionToken
}
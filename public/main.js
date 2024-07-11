const errorMessageEle = document.getElementById("error-message");
const usernameEle = document.getElementById("username");
const passwordEle = document.getElementById("password");
const trustChk = document.getElementById("trust");
const trustedOriginEle = document.getElementById("trusted-origin");
const submitBtn = document.getElementById("submit");

// Check if this window was opened incorrectly
let isLoginBroken = false;

const params = new URLSearchParams(location.search);
let callbackUrl;

function brokeLogin() {
	errorMessageEle.innerText = "This page was not opened correctly.";
	isLoginBroken = true;
}

if (!params.has("state") || !params.has("challenge")) brokeLogin();

try {
	callbackUrl = decodeURIComponent(params.get("callback"));

	let url = new URL(callbackUrl); // NOTE: Throws an error if the callback url is invalid

	trustedOriginEle.innerText = url.origin;
} catch {
	brokeLogin();

	trustedOriginEle.innerText = "Unknown Origin";
	trustedOriginEle.classList.add("error");
}

// Authorization code
function updateSubmitButton() {
	submitBtn.disabled =
		!usernameEle.validity.valid ||
		!passwordEle.validity.valid ||
		!trustChk.checked ||
		isLoginBroken;
}

usernameEle.addEventListener("input", () => updateSubmitButton());
passwordEle.addEventListener("input", () => updateSubmitButton());
trustChk.addEventListener("input", () => updateSubmitButton());

submitBtn.addEventListener("click", () => authenticate());

async function authenticate() {
	let ogText = submitBtn.innerText;

	submitBtn.disabled = true;
	usernameEle.disabled = true;
	passwordEle.disabled = true;
	trustChk.disabled = true;
	errorMessageEle.innerText = "";

	function restoreInputs() {
		submitBtn.innerText = ogText;
		submitBtn.disabled = false;
		usernameEle.disabled = false;
		passwordEle.disabled = false;
		trustChk.disabled = false;
	}

	function requestErrorHandler(err, defaultMessage = "Something went wrong") {
		errorMessageEle.innerText =
			err?.response?.data?.message ?? defaultMessage;
		restoreInputs();
	}

	submitBtn.innerText = "Authorizing";

	axios
		.post("/oauth/authorize", {
			username: usernameEle.value,
			password: passwordEle.value,
			challenge: params.get("challenge")
		})
		.then(async (res) => {
			if (res.status !== 200 || res?.data?.error) {
				return requestErrorHandler(null, res.data.message);
			}

			location.href = `${callbackUrl}?state=${params.get("state")}`;
		})
		.catch((err) =>
			requestErrorHandler(err, "Something went wrong whilst authorizing")
		);
}

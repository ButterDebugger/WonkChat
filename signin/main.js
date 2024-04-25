import * as openpgp from "https://cdn.jsdelivr.net/npm/openpgp@5.10.2/+esm";
import * as binForage from "https://debutter.dev/x/js/binforage.js";

const stepNumberEle = document.getElementById("step-number");
const errorMessageEle = document.getElementById("error-message");

const stepOneEle = document.getElementById("step-one");
const usernameEle = document.getElementById("username");
const passwordEle = document.getElementById("password");
const trustChk = document.getElementById("trust");
const trustedOriginEle = document.getElementById("trusted-origin")
const nextBtn = document.getElementById("next-step");

const stepTwoEle = document.getElementById("step-two");
const keySizeEle = document.getElementById("key-size");
const generateKeyPairBtn = document.getElementById("generate-key-pair");
const publicKeyEle = document.getElementById("public-key");
const privateKeyEle = document.getElementById("private-key");
const previousStepBtn = document.getElementById("previous-step");
const submitBtn = document.getElementById("submit");

// Check if this window was opened incorrectly
let brokenSignIn = false;

if (!window?.opener) {
    errorMessageEle.innerText = "This window cannot be opened directly.";
    brokenSignIn = true;
} else if (!query.has("origin")) {
    errorMessageEle.innerText = "This window was opened without a valid origin.";
    brokenSignIn = true;
}

let origin = new URLSearchParams(location.search).get("origin");

try {
    new URL(origin); // Throws an error if the origin is invalid

    trustedOriginEle.innerText = origin;
} catch (err) {
    errorMessageEle.innerText = "This window was opened without a valid origin.";
    brokenSignIn = true;

    trustedOriginEle.innerText = "Unknown Origin";
    trustedOriginEle.classList.add("error");
}

function updateStepButtons() {
    // Update next step button
    if (usernameEle.validity.valid && passwordEle.validity.valid && trustChk.checked && !brokenSignIn) {
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }

    // Update submit button
    if (
        usernameEle.validity.valid &&
        passwordEle.validity.valid &&
        trustChk.checked &&
        publicKeyEle.validity.valid &&
        privateKeyEle.validity.valid
    ) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

function updateGenerateButton() {
    if (privateKeyEle.validity.valid && publicKeyEle.validity.valid) {
        generateKeyPairBtn.classList.remove("highlight");
    } else {
        generateKeyPairBtn.classList.add("highlight");
    }
}

usernameEle.addEventListener("input", () => updateStepButtons());
passwordEle.addEventListener("input", () => updateStepButtons());
trustChk.addEventListener("input", () => updateStepButtons());

nextBtn.addEventListener("click", () => {
    stepNumberEle.innerText = "2";
    stepOneEle.classList.add("hidden");
    stepTwoEle.classList.remove("hidden");
});

previousStepBtn.addEventListener("click", () => {
    stepNumberEle.innerText = "1";
    stepOneEle.classList.remove("hidden");
    stepTwoEle.classList.add("hidden");
});

let initialKeyPair = await binForage.get("keyPair");

if (initialKeyPair !== null) {
    publicKeyEle.value = initialKeyPair.publicKey;
    privateKeyEle.value = initialKeyPair.privateKey;
} else {
    privateKeyEle.addEventListener("input", () => updateGenerateButton());
    publicKeyEle.addEventListener("input", () => updateGenerateButton());
    updateGenerateButton();
}

generateKeyPairBtn.addEventListener("click", async () => {
    let { publicKey, privateKey } = await generateKeyPair(usernameEle.value, parseInt(keySizeEle.value));

    publicKeyEle.value = publicKey;
    privateKeyEle.value = privateKey;
    updateGenerateButton();
    updateStepButtons();
});

publicKeyEle.addEventListener("input", () => updateStepButtons());
privateKeyEle.addEventListener("input", () => updateStepButtons());

submitBtn.addEventListener("click", () => authenticate());

async function authenticate(speed = 500) {
    let ogText = submitBtn.innerText;

    submitBtn.disabled = true;
    usernameEle.disabled = true;
    passwordEle.disabled = true;
    trustChk.disabled = true;
    keySizeEle.disabled = true;
    generateKeyPairBtn.disabled = true;
    privateKeyEle.disabled = true;
    publicKeyEle.disabled = true;
    errorMessageEle.innerText = "";

    function restoreInputs() {
        submitBtn.disabled = false;
        usernameEle.disabled = false;
        passwordEle.disabled = false;
        trustChk.disabled = false;
        keySizeEle.disabled = false;
        generateKeyPairBtn.disabled = false;
        privateKeyEle.disabled = false;
        publicKeyEle.disabled = false;

        submitBtn.innerText = ogText;
    }

    function requestErrorHandler(err, defaultMessage = "Something went wrong") {
        errorMessageEle.innerText = err?.response?.data?.message ?? defaultMessage;
        restoreInputs();
    }

    submitBtn.innerText = "Saving Login Info";

    let keyPair = {
        publicKey: publicKeyEle.value,
        privateKey: privateKeyEle.value
    };

    await binForage.set("keyPair", keyPair);

    submitBtn.innerText = "Authorizing";

    axios.post("/auth/login", {
        username: usernameEle.value,
        password: passwordEle.value
    }).then(async (res) => {
        let { nonce } = res.data;

        submitBtn.innerText = "Verifying";

        let signedNonce = await signMessage(nonce, keyPair.privateKey);

        axios.post("/auth/verify", {
            signedNonce: signedNonce,
            publicKey: keyPair.publicKey
        }).then((res) => {
            let { token } = res.data;

            window?.opener?.postMessage({
                token,
                username: usernameEle.value,
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            }, origin);

            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    window.close();
                }
            });

            restoreInputs();
        }).catch(err => requestErrorHandler(err, "Something went wrong whilst verifying"));
    }).catch(err => requestErrorHandler(err, "Something went wrong whilst authorizing"));
}

async function signMessage(message, privateKey) {
    return await openpgp.sign({
        message: await openpgp.createMessage({ text: message }),
        signingKeys: await openpgp.readKey({ armoredKey: privateKey })
    });
}

async function generateKeyPair(name, bits = 2048) {
	let { publicKey, privateKey } = await openpgp.generateKey({
		type: "rsa",
		rsaBits: bits,
		userIDs: [{
            name: name
		}]
	});

	return {
		publicKey: publicKey,
		privateKey: privateKey
	};
}

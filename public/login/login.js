import { Client, generateKeyPair } from "../lib/client.js";
import { delay } from "https://debutter.dev/x/js/utils.js@1.2";
import * as binForage from "https://debutter.dev/x/js/binforage.js";
import { ClientError } from "../lib/builtinErrors.js";

let client = new Client();

const usernameEle = document.getElementById("username");
const publicKeyEle = document.getElementById("public-key");
const privateKeyEle = document.getElementById("private-key");

const restoreKeyPairBtn = document.getElementById("restore-key-pair");
const generateKeyPairBtn = document.getElementById("generate-key-pair");
const hasKeyPairBtn = document.getElementById("has-key-pair");

const keyPairField = document.getElementById("key-pair-field");
const publicKeyField = document.getElementById("public-key-field");
const privateKeyField = document.getElementById("private-key-field");

const submitBtn = document.getElementById("submit");
const errorMessageEle = document.getElementById("error-message");

tippy(usernameEle, {
    content: "<p style=\"text-align: center; margin: 0px;\">What you will go by</p>",
    allowHTML: true,
    delay: [500, 0]
});

let initialPublicKey = await binForage.get("publicKey");
let initialPrivateKey = await binForage.get("privateKey");
let initialUsername = await binForage.get("username");

if (initialPublicKey !== null && initialPrivateKey !== null) {
    restoreKeyPairBtn.classList.remove("hidden");
    restoreKeyPairBtn.classList.add("highlight");

    function restore() {
        publicKeyField.classList.remove("hidden");
        privateKeyField.classList.remove("hidden");
        keyPairField.classList.add("hidden");

        publicKeyEle.value = initialPublicKey;
        privateKeyEle.value = initialPrivateKey;
    }

    restoreKeyPairBtn.addEventListener("click", () => {
        restore();
        updateSubmitButton();
    });

    let query = new URLSearchParams(location.search);

    if (query.has("refresh")) {
        usernameEle.value = initialUsername;
        restore();
        let valid = updateSubmitButton();

        if (valid) { // Automatically authenticate if all inputs are valid
            authenticate(100);
        }
    }
} else {
    generateKeyPairBtn.classList.add("highlight");
}

generateKeyPairBtn.addEventListener("click", async () => {
    publicKeyField.classList.remove("hidden");
    privateKeyField.classList.remove("hidden");
    keyPairField.classList.add("hidden");

    let { publicKey, privateKey } = await generateKeyPair(usernameEle.value);

    publicKeyEle.value = publicKey;
    privateKeyEle.value = privateKey;
    updateSubmitButton();
});

hasKeyPairBtn.addEventListener("click", async () => {
    publicKeyField.classList.remove("hidden");
    privateKeyField.classList.remove("hidden");
    keyPairField.classList.add("hidden");
});

usernameEle.addEventListener("input", updateSubmitButton);
usernameEle.addEventListener("keypress", ({ code }) => {
    if (code !== "Enter") return;
    
    let valid = updateSubmitButton();
    if (valid) authenticate();
});
publicKeyEle.addEventListener("input", updateSubmitButton);
privateKeyEle.addEventListener("input", updateSubmitButton);

function updateSubmitButton() {
    let valid = usernameEle.validity.valid && publicKeyEle.validity.valid && privateKeyEle.validity.valid;
    submitBtn.disabled = !valid;
    return valid;
}

async function authenticate(speed = 500) {
    let ogText = submitBtn.innerText;

    submitBtn.disabled = true;
    usernameEle.disabled = true;
    privateKeyEle.disabled = true;
    publicKeyEle.disabled = true;
    errorMessageEle.innerText = "";

    let username = usernameEle.value;
    let publicKey = publicKeyEle.value;
    let privateKey = privateKeyEle.value;

    submitBtn.innerText = "Saving Login Info";
    await delay(speed);

    await binForage.set("username", username);
    await binForage.set("publicKey", publicKey);
    await binForage.set("privateKey", privateKey);

    submitBtn.innerText = "Authorizing";
    await delay(speed);

    try {
        let result = await client.authorize(username, publicKey, privateKey);
        
        if (result) {
            location.href = "/app/";
        } else {
            errorMessageEle.innerText = "Failed to authenticate";

            submitBtn.disabled = false;
            usernameEle.disabled = false;
            privateKeyEle.disabled = false;
            publicKeyEle.disabled = false;
        
            submitBtn.innerText = ogText;
        }
    } catch (err) {
        if (err instanceof ClientError) {
            errorMessageEle.innerText = err.message;
        } else {
            errorMessageEle.innerText = "Something went wrong whilst authenticating";
        }
        
        submitBtn.disabled = false;
        usernameEle.disabled = false;
        privateKeyEle.disabled = false;
        publicKeyEle.disabled = false;
    
        submitBtn.innerText = ogText;
    }
}

submitBtn.addEventListener("click", async () => {
    authenticate();
});

import cookies from "https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/+esm";
import * as cryption from "../cryption.js";
import { delay } from "https://debutter.dev/x/js/utils.js@1.2";
import * as binForage from "https://debutter.dev/x/js/binforage.js";

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

let initialKeyPair = await binForage.get("login[keyPair]");
let initialUsername = await binForage.get("login[username]");

if (initialKeyPair !== null) {
    restoreKeyPairBtn.classList.remove("hidden");
    restoreKeyPairBtn.classList.add("highlight");

    function restore() {
        publicKeyField.classList.remove("hidden");
        privateKeyField.classList.remove("hidden");
        keyPairField.classList.add("hidden");

        publicKeyEle.value = initialKeyPair.publicKey;
        privateKeyEle.value = initialKeyPair.privateKey;
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

    let { publicKey, privateKey } = await cryption.generateKeyPair(usernameEle.value);

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

    let keyPair = {
        publicKey: publicKeyEle.value,
        privateKey: privateKeyEle.value
    };

    submitBtn.innerText = "Saving Login Info";
    await delay(speed);

    await binForage.set("login[keyPair]", keyPair);
    await binForage.set("login[username]", usernameEle.value);

    submitBtn.innerText = "Authorizing";
    await delay(speed);

    axios.post(`${location.origin}/api/auth/login`, {
        username: usernameEle.value,
        publicKey: keyPair.publicKey
    }).then(async (res) => {
        let { id, message } = res.data;
        
        submitBtn.innerText = "Verifying";
        await delay(speed);

        let decrypted = await cryption.decrypt(message, keyPair.privateKey);

        axios.post(`${location.origin}/api/auth/verify/${id}`, {
            message: decrypted
        }).then((res) => {
            let { id, token } = res.data;
            
            cookies.set("token", token, { expires: 365 });
            cookies.set("session", id); // Create session cookie
            
            location.href = "/app/";
        }).catch(err => {
            if (typeof err?.response?.data == "object") {
                errorMessageEle.innerText = err?.response?.data?.message;
            } else {
                errorMessageEle.innerText = "Something went wrong while verifying";
            }
        });
    }).catch(err => {
        if (typeof err?.response?.data == "object") {
            errorMessageEle.innerText = err?.response?.data?.message;
        } else {
            errorMessageEle.innerText = "Something went wrong while authorizing";
        }

        submitBtn.disabled = false;
        usernameEle.disabled = false;
        privateKeyEle.disabled = false;
        publicKeyEle.disabled = false;

        submitBtn.innerText = ogText;
    });
}

submitBtn.addEventListener("click", async () => {
    authenticate();
});

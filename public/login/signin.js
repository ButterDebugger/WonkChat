import cookies from "https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/+esm";
import * as openpgp from "https://cdn.jsdelivr.net/npm/openpgp@5.9.0/+esm";
import { delay } from "https://butterycode.com/static/js/utils.js@1.2";
import * as binForage from "https://butterycode.com/static/js/binforage.js";

const usernameEle = document.getElementById("username");
const passwordEle = document.getElementById("password");
const submitBtn = document.getElementById("submit");
const errorMessageEle = document.getElementById("error-message");

tippy(usernameEle, {
    content: "<p style=\"text-align: center; margin: 0px;\">What you will go by</p>",
    allowHTML: true,
    delay: [500, 0]
});

tippy(passwordEle, {
    content: "<p style=\"text-align: center; margin: 0px;\">Restore PGP key pair saved inside your browser</p>",
    allowHTML: true,
    delay: [500, 0]
});

usernameEle.addEventListener("input", updateSubmitButton);
passwordEle.addEventListener("input", updateSubmitButton);

function updateSubmitButton() {
    submitBtn.disabled = !(usernameEle.validity.valid && passwordEle.validity.valid);
}

submitBtn.addEventListener("click", async () => {
    let ogText = submitBtn.innerText;
    let storageKey = `keyPair[${passwordEle.value}]`;

    submitBtn.disabled = true;
    usernameEle.disabled = true;
    passwordEle.disabled = true;
    errorMessageEle.innerText = "";

    submitBtn.innerText = "Getting Key Pair";
    await delay(500);

    let keyPair = await binForage.get(storageKey);

    if (keyPair === null) {
        submitBtn.innerText = "Generating New Key Pair";
        await delay(500);

        let { publicKey, privateKey } = await openpgp.generateKey({
            type: 'rsa',
            rsaBits: 2048,
            userIDs: [{
                name: usernameEle.value
            }]
        });

        keyPair = {
            publicKey,
            privateKey
        }

        submitBtn.innerText = "Saving New Key Pair";
        await delay(500);

        await binForage.set(storageKey, keyPair);
    }

    submitBtn.innerText = "Authorizing";
    await delay(500);

    axios.post(`${location.origin}/auth/login`, {
        username: usernameEle.value,
        publicKey: keyPair.publicKey
    }).then(async (res) => {
        let { id, message } = res.data;
        
        submitBtn.innerText = "Verifying";
        await delay(500);

        let { data: decrypted } = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: await openpgp.readKey({ armoredKey: keyPair.privateKey })
        });

        axios.post(`${location.origin}/auth/verify/${id}`, {
            message: decrypted
        }).then((res) => {
            let token = res.data.token;
            
            cookies.set("token", token, { expires: 365 });
            
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
        passwordEle.disabled = false;

        submitBtn.innerText = ogText;
    });
});

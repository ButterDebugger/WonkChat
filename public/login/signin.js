import { setCookie } from "https://butterycode.com/static/js/utils.js@1.2";

const passwordEle = document.getElementById("password");
const hasPasswordBox = document.getElementById("haspassword");
const passwordField = document.getElementById("password-field");
const submitButton = document.getElementById("submit-button");
const signinForm = document.getElementById("signin-form");

document.getElementById("show-password").addEventListener("change", ({ target }) => {
    let checked = target.checked;

    passwordEle.type = checked ? "text" : "password";
});

hasPasswordBox.addEventListener("change", ({ target }) => {
    let checked = target.checked;

    updateForm(checked);
});

window.addEventListener("load", () => {
    updateForm(hasPasswordBox.checked);
});

function updateForm(isUser) {
    if (isUser) {
        passwordField.classList.remove("hidden");
        passwordEle.setAttribute("required", true);
        submitButton.innerText = "Sign in";
    } else {
        passwordField.classList.add("hidden");
        passwordEle.removeAttribute("required");
        submitButton.innerText = "Join as Guest";
    }
}

async function submitAuth() {
    let username = document.getElementById("username")?.value;
    let hasPassword = document.getElementById("haspassword")?.checked;
    let password = document.getElementById("password")?.value;

    await axios.post(`${location.origin}/api/auth`, {
        username: username,
        password: password,
        isGuest: !hasPassword
    }).then((res) => {
        let token = res.data.token;

        setCookie("token", token);

        location.href = "/app/";
    }).catch(error => {
        if (typeof error?.response?.data == "object") {
            document.getElementById("logout-reason").innerText = error?.response?.data?.message;
        } else {
            document.getElementById("logout-reason").innerText = "Something went wrong";
        }

        signinForm.reset();
    });
}

signinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    submitAuth();
});

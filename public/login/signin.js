const passwordEle = document.getElementById("password");
const showPasswordBox = document.getElementById("show-password");
const hasPasswordBox = document.getElementById("haspassword");
const passwordField = document.getElementById("password-field");
const submitButton = document.getElementById("submit-button");

// if (!(location.pathname == "/login" || location.pathname == "/login/") || location.search.length > 0) {
//     window.history.replaceState(null, null, "/login/")
// }

showPasswordBox.addEventListener("change", ({ target }) => {
    let checked = target.checked;

    passwordEle.type = checked ? "text" : "password";
});

hasPasswordBox.addEventListener("change", ({ target }) => {
    let checked = target.checked;

    updateForm(checked);
});

function updateForm(isUser) {
    if (isUser) {
        passwordField.classList.remove("hidden");
        submitButton.innerText = "Sign in";
    } else {
        passwordField.classList.add("hidden");
        submitButton.innerText = "Join as Guest";
    }
}

window.addEventListener("load", () => {
    updateForm(hasPasswordBox.checked);
});

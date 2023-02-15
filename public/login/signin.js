const passwordEle = document.getElementById("password");
const showPasswordBox = document.getElementById("show-password");

if (!(location.pathname == "/login" || location.pathname == "/login/") || location.search.length > 0) {
    window.history.replaceState(null, null, "/login/")
}

showPasswordBox.addEventListener("change", ({ target }) => {
    var checked = target.checked;

    passwordEle.type = checked ? "text" : "password";
});

const passwordEle = document.getElementById("password");
const showPasswordBox = document.getElementById("show-password");

if (!(location.pathname == "/signin" || location.pathname == "/signin/") || location.search.length > 0) {
    window.history.replaceState(null, null, "/signin/")
}

showPasswordBox.addEventListener("change", ({ target }) => {
    var checked = target.checked;

    passwordEle.type = checked ? "text" : "password";
});

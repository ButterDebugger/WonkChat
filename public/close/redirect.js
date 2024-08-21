const continueBtn = document.getElementById("continue");
const params = new URLSearchParams(location.search);

let redirectUrl = params.get("redirect");

if (redirectUrl === null) {
	continueBtn.disabled = true;
}

continueBtn.addEventListener("click", () => {
	location.href = decodeURIComponent(redirectUrl);
});

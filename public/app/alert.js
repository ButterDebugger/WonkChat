let alertQueue = [];
let revealTimeout = null;
let persistTimeout = null;
let removeTimeout = null;

function createAlertElement(message) {
    let alertBox = document.createElement("div");
    alertBox.classList.add("alert-box");

    let alertMsg = document.createElement("span");
    alertMsg.classList.add("alert-text");
    alertMsg.innerText = message;
    alertBox.appendChild(alertMsg);

    let alertClose = document.createElement("img");
    alertClose.classList.add("alert-close", "no-select", "no-drag");
    alertClose.src = "/icons/xmark-solid.svg";
    alertClose.addEventListener("click", () => {
        closeCurrentAlert(alertBox);
    });
    alertBox.appendChild(alertClose);

    return alertBox;
}

function closeCurrentAlert(alertEle) {
    clearTimeout(revealTimeout);
    clearTimeout(persistTimeout);
    clearTimeout(removeTimeout);
    
    alertEle.classList.remove("reveal");

    removeTimeout = setTimeout(() => {
        alertEle.remove();

        showNextAlert();
    }, 350);
}

function showNextAlert() {
    if (alertQueue.length == 0) return;

    let { message, duration } = alertQueue.shift();

    showAlert(message, duration);
}

export default function showAlert(message, duration = 2500) {
    if (document.querySelector(".alert-box") !== null) {
        alertQueue.push({
            message: message,
            duration: duration
        });
        return;
    }

    let alertEle = createAlertElement(message);
    document.body.appendChild(alertEle);

    revealTimeout = setTimeout(() => {
        alertEle.classList.add("reveal");

        persistTimeout = setTimeout(() => {
            alertEle.classList.remove("reveal");

            removeTimeout = setTimeout(() => {
                alertEle.remove();
                
                showNextAlert();
            }, 350);
        }, duration);
    }, 350);
}

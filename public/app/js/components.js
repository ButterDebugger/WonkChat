import { isNil, dom, domParser } from "https://butterycode.com/static/js/utils.js@1.2";

export function chatMessage(username, color, discriminator, content, timestamp, attachments = []) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message-container");
    
    let msgEle = document.createElement("div");
    msgEle.classList.add("message");
    
    if (!isNil(timestamp)) {
        msgEle.appendChild(timestampComponent(timestamp));
    }

    msgEle.appendChild(userDisplay(username, color, discriminator));

    let contEle = document.createElement("span");
    contEle.classList.add("content");
    contEle.innerText = content;
    msgEle.appendChild(contEle);
    
    msgContainer.appendChild(msgEle);

    let attachmentsContainer = document.createElement("div");
    attachmentsContainer.classList.add("message-attachments");

    attachments.forEach(path => {
        let filename = path.split("/").pop();
        let attachmentEle = attachmentComponent(filename);

        attachmentEle.classList.add("clickable");
        attachmentEle.addEventListener("click", () => {
            window.open(`${location.origin}/${path}`, "_blank");
        });

        attachmentsContainer.appendChild(attachmentEle);
    });
    
    msgContainer.appendChild(attachmentsContainer);

    return msgContainer;
}

export function userDisplay(username, color, discriminator = null, stayVisible = false) {
    let userEle = document.createElement("div");

    let nameEle = document.createElement("span");
    nameEle.classList.add("username");
    nameEle.innerText = `${username}`;
    nameEle.style.color = color;
    userEle.appendChild(nameEle);

    if (!isNil(discriminator)) {
        let discEle = document.createElement("span");
        discEle.classList.add("discriminator");
        if (stayVisible) discEle.classList.add("stay-visible");
        discEle.innerText = "#" + `00${discriminator}`.slice(-2);
        userEle.appendChild(discEle);
    }

    return userEle;
}

export function timestampComponent(timestamp) {
    let time = moment(timestamp).format("h:mm A");
    let fullDate = moment(timestamp).format("dddd, MMMM Do, YYYY h:mm:ss A");

    let timeEle = document.createElement("span");
    timeEle.classList.add("timestamp");
    timeEle.innerText = time;

    tippy(timeEle, {
        content: fullDate
    });

    return timeEle;
}

export function attachmentComponent(name) {
    let attachmentEle = document.createElement("div");

    attachmentEle.classList.add("attachment");
    attachmentEle.innerText = name;

    return attachmentEle;
}

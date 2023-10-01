import { isNil, dom, domParser } from "https://debutter.dev/x/js/utils.js@1.2";
import { openDirectMessage } from "./chat.js";

export function chatMessage(username, color, id, offline, content, timestamp, attachments = []) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message-container");
    
    let msgEle = document.createElement("div");
    msgEle.classList.add("message");
    msgEle.appendChild(timestampComponent(timestamp));
    msgEle.appendChild(userDisplay(username, color, id, offline));

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

export function joinRoomMessage(username, color, id, offline, timestamp = Date.now()) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message");

    msgContainer.appendChild(timestampComponent(timestamp));
    msgContainer.appendChild(userDisplay(username, color, id, offline));

    let contEle = document.createElement("span");
    contEle.classList.add("notification");
    contEle.innerText = " has joined the chat";
    msgContainer.appendChild(contEle);

    return msgContainer;
}

export function leaveRoomMessage(username, color, id, offline, timestamp = Date.now()) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message");

    msgContainer.appendChild(timestampComponent(timestamp));
    msgContainer.appendChild(userDisplay(username, color, id, offline));

    let contEle = document.createElement("span");
    contEle.classList.add("notification");
    contEle.innerText = " has left the chat";
    msgContainer.appendChild(contEle);

    return msgContainer;
}

export function userDisplay(username, color, id, offline = false) {
    let nameEle = document.createElement("span");
    nameEle.classList.add("username");
    if (offline) nameEle.classList.add("offline");
    nameEle.setAttribute("data-id", id);
    nameEle.innerText = `${username}`;
    nameEle.style.color = color;

    nameEle.addEventListener("click", () => {
        openDirectMessage(id);
    });

    return nameEle;
}

export function timestampComponent(timestamp) {
    let time = moment(timestamp).format("h:mm A");
    let fullDate = moment(timestamp).format("dddd, MMMM Do, YYYY h:mm:ss A");

    let timeEle = document.createElement("span");
    timeEle.classList.add("timestamp");
    timeEle.innerText = time;
    timeEle.setAttribute("data-time", timestamp);

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

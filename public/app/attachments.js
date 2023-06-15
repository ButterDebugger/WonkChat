const attachBtn = document.getElementById("attach-button");
const attachmentBox = document.getElementById("attachment-box");
const attachmentform = attachmentBox.querySelector("form");
export const attachmentsContainer = document.getElementById("attachments-container");

import {
    client
} from "./client.js";

import {
    isAtBottomOfMessages,
    getMessagesContainer,
    messageInput
} from "./chat.js";

attachBtn.addEventListener("click", () => {
    let scroll = isAtBottomOfMessages();
    let messages = getMessagesContainer();

    if (scroll) {
        messages.style["scroll-behavior"] = "unset";
        messages?.lastChild?.scrollIntoView();
        messages.style["scroll-behavior"] = "";
    }
    
    if (!attachBtn.classList.contains("loading")) {
        attachmentform.querySelector("input[name='files']").click();
    }
});

attachmentform.addEventListener("submit", (event) => {
    event.preventDefault();
    uploadAttachments();
});

attachmentform.querySelector("input[name='files']").addEventListener("change", () => {
    uploadAttachments();
});

function uploadAttachments() {
    if (messageInput.disabled) return;
    messageInput.disabled = true;
    attachBtn.classList.add("loading");

    fetch(attachmentform.action, {
        method: attachmentform.method,
        body: new FormData(attachmentform),
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(attachments => {
        let scroll = isAtBottomOfMessages();
        let messages = getMessagesContainer();

        attachments.filter(attachment => attachment.success && !client.attachments.includes(attachment.path)).forEach(attachment => {
            client.attachments.push(attachment.path);

            let attachmentEle = document.createElement("div");
            attachmentEle.classList.add("attachment");
            attachmentEle.innerText = attachment.filename;
            attachmentsContainer.appendChild(attachmentEle);
        });
        
        if (scroll) {
            messages.style["scroll-behavior"] = "unset";
            messages?.lastChild?.scrollIntoView();
            messages.style["scroll-behavior"] = "";
        }
    })
    .catch(error => {
        console.error(error.message);
    })
    .finally(() => {
        messageInput.disabled = false;
        attachBtn.classList.remove("loading");
    });
}

const attachBtn = document.getElementById("attach-button");
const attachmentBox = document.getElementById("attachment-box");

import {
    client
} from "./client.js";

import {
    isAtBottomOfMessages,
    getMessagesContainer,
    messageInput
} from "./chat.js";

let fileData = new FormData();

attachBtn.addEventListener("click", () => {
    let scroll = isAtBottomOfMessages();
    let messages = getMessagesContainer();

    if (scroll) {
        messages.style["scroll-behavior"] = "unset";
        messages?.lastChild?.scrollIntoView();
        messages.style["scroll-behavior"] = "";
    }

    let filesInput = document.createElement("input");
    filesInput.type = "file";
    filesInput.name = "files";
    filesInput.multiple = true;

    filesInput.click();

    filesInput.addEventListener("change", () => {
        for (let i = 0; i < filesInput.files.length; i++) {
            fileData.append("files", filesInput.files.item(i));
        }
        filesInput.remove();
        uploadAttachments();
    });
});

async function uploadAttachments() {
    if (messageInput.disabled) return;

    messageInput.disabled = true;
    attachBtn.classList.add("loading");

    let uploadRes = await axios({
        method: "post",
        url: "/upload",
        data: fileData,
        headers: {
            "Content-Type": "multipart/form-data",
            "Accept": "application/json"
        },
    });

    if (uploadRes.status !== 200) { // TODO: do more to handle this error
        messageInput.disabled = false;
        attachBtn.classList.remove("loading");
        return;
    }

    let attachments = uploadRes.data;
    let scroll = isAtBottomOfMessages();
    let messages = getMessagesContainer();

    attachments.filter(attachment => attachment.success && !client.attachments.includes(attachment.path)).forEach(attachment => {
        client.attachments.push(attachment.path);

        let attachmentEle = document.createElement("div");
        attachmentEle.classList.add("attachment");
        attachmentEle.innerText = attachment.filename;
        attachmentBox.appendChild(attachmentEle);
    });
    
    if (scroll) {
        messages.style["scroll-behavior"] = "unset";
        messages?.lastChild?.scrollIntoView();
        messages.style["scroll-behavior"] = "";
    }
    
    messageInput.disabled = false;
    attachBtn.classList.remove("loading");
}

export function clearAttachmentsBox() {
    while (attachmentBox.firstChild) {
        attachmentBox.removeChild(attachmentBox.firstChild);
    }
}

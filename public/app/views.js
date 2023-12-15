import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";
import { createMessage } from "./components.js";
import { switchDrawer } from "./ui.js";
import { sendMessage } from "./main.js";

const viewWrappers = new Map();

function hasWrapper(key) {
    return viewWrappers.has(key);
}

function getOrCreateWrapper(key) {
    if (viewWrappers.has(key)) return viewWrappers.get(key);

    let headerEle = domParser(`<div class="header"></div>`);
    let contentEle = domParser(`<div class="content"></div>`);
    let footerEle = domParser(`<div class="footer"></div>`);

    let wrapper = {
        header: headerEle,
        content: contentEle,
        footer: footerEle
    };

    viewWrappers.set(key, wrapper);
    return wrapper;
}

export function getOrCreateRoomWrapper(room) {
    let roomKey = `#${room.name}`;
    if (hasWrapper(roomKey)) return viewWrappers.get(roomKey);

    let wrapper = getOrCreateWrapper(roomKey);

    wrapper.header.classList.add("room");
    wrapper.content.classList.add("room");
    wrapper.footer.classList.add("room");

    // Append footer message box
    let messageBox = domParser(
        `<div class="message-box">
            <div class="message-box-icon-container">
                <span name="attach-button" class="message-box-icon ic-raw ic-plus"></span>
            </div>
            <input type="text" name="message-input" maxlength="1000">
            <div class="message-box-icon-container">
                <span name="send-button" class="message-box-icon ic-raw ic-arrow-up"></span>
            </div>
        </div>`
    );
    messageBox.querySelector("input").placeholder = `Message #${room.name}`;
    wrapper.footer.appendChild(messageBox);

    // Add send message handlers
    const send = async function() {
        let value = messageBox.querySelector("input").value;
        if (value.length === 0) return;

        let result = await sendMessage(room.name, {
            text: value
        });

        if (result) {
            messageBox.querySelector("input").value = "";
        } else {
            alert("Failed to send message"); // TODO: make fancier
        }
    }
    messageBox.querySelector("input").addEventListener("keydown", ({ key }) => {
        if (key === "Enter") send();
    });
    messageBox.querySelector("span[name=send-button]").addEventListener("click", send);

    // Append back icon to wrapper header
    let backIcon = domParser(
        `<div class="back-icon-container">
            <span class="back-icon ic-raw ic-chevron-left"></span>
        </div>`
    );
    backIcon.addEventListener("click", () => {
        switchDrawer("rooms");
    });
    wrapper.header.appendChild(backIcon);

    // Append room name to wrapper header
    let title = domParser(`<span class="title"></span>`);
    title.innerText = room.name;
    wrapper.header.appendChild(title);

    // Append room description to wrapper header
    let description = domParser(`<span class="description"></span>`);
    description.innerText = room.description;
    wrapper.header.appendChild(description);

    return wrapper;
}

export function appendMessage(message) {
    let wrapper = getOrCreateWrapper(`#${message.room.name}`);
    let messageEle = createMessage(message);
    wrapper.content.appendChild(messageEle);
}

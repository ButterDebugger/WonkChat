import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";
import { createMessage } from "../components.js";
import { changeViewDrawer, switchDrawer } from "../ui.js";
import { sendMessage } from "../main.js";
import { hasWrapper, getOrCreateWrapper, getWrapper } from "./wrapper.js";
import { getOrCreateRoomInfoWrapper } from "./room-info.js";

export function getOrCreateRoomWrapper(room) {
    let roomKey = `#${room.name}`;
    if (hasWrapper(roomKey)) return getWrapper(roomKey);

    let wrapper = getOrCreateWrapper(roomKey);

    wrapper.header.classList.add("room");
    wrapper.content.classList.add("room");
    wrapper.footer.classList.add("room");

    // Append footer message box
    let messageBox = domParser(
        `<div class="message-box">
            <div class="ic-normal-container">
                <span name="attach-button" class="message-box-icon ic-raw ic-normal ic-plus"></span>
            </div>
            <input type="text" name="message-input" maxlength="1000">
            <div class="ic-normal-container">
                <span name="send-button" class="message-box-icon ic-raw ic-normal ic-arrow-up"></span>
            </div>
        </div>`
    );
    messageBox.querySelector("input").placeholder = `Message #${room.name}`;
    wrapper.footer.appendChild(messageBox);

    // Add send message handlers
    const send = async function() {
        let value = messageBox.querySelector("input").value;
        messageBox.querySelector("input").value = "";

        if (value.length === 0) return;

        let result = await sendMessage(room.name, {
            text: value
        });

        if (!result) {
            alert("Failed to send message"); // TODO: make fancier
        }
    }
    messageBox.querySelector("input").addEventListener("keydown", ({ key }) => {
        if (key === "Enter") send();
    });
    messageBox.querySelector("span[name=send-button]").addEventListener("click", send);

    // Append back icon to wrapper header
    let backIcon = domParser(
        `<div class="ic-small-container">
            <span class="ic-raw ic-small ic-chevron-left"></span>
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

    // Append flex spacer
    let spacer = domParser(`<div class="flex-spacer"></div>`);
    wrapper.header.appendChild(spacer);

    // Append more icon to wrapper header
    let moreIcon = domParser(
        `<div class="ic-small-container">
            <span class="ic-raw ic-small ic-ellipsis"></span>
        </div>`
    );
    moreIcon.addEventListener("click", () => {
        switchDrawer("view");

        let wrapper = getOrCreateRoomInfoWrapper(room);
        changeViewDrawer(wrapper);
    });
    wrapper.header.appendChild(moreIcon);

    return wrapper;
}

export function appendMessage(message) {
    let wrapper = getOrCreateWrapper(`#${message.room.name}`);
    let scroll = wrapper.content.scrollHeight - Math.ceil(wrapper.content.scrollTop) <= wrapper.content.clientHeight;
    let messageEle = createMessage(message);
    wrapper.content.appendChild(messageEle);

    if (scroll) {
        wrapper.content.style["scroll-behavior"] = "unset";
        messageEle.scrollIntoView();
        wrapper.content.style["scroll-behavior"] = "";
    }
}
const messagesWrapper = document.getElementById("messages-wrapper");
const membersWrapper = document.getElementById("members-wrapper");
const sendButton = document.getElementById("send-button");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("messagebox");
export const messageInput = document.getElementById("message-input");

import { getCookies } from "https://butterycode.com/static/js/utils.js@1.2";

import {
    init as initAttachments,
    attachmentsContainer
} from "./attachments.js";

import {
    init as initNavbar,
    navbarChannels
} from "./navbar.js";

import {
    chatMessage
} from "./components.js";

import {
    getMembersContainer,
    setMembers
} from "./members.js";

initAttachments();
initNavbar();

import { socket, receiver, makeRequest, gatewayUrl } from "./comms.js";

export let client = {
    linked: false,
    currentRoom: null,
    rooms: new Map(),
    attachments: []
};

receiver.addEventListener("link", async ({ detail }) => {
    if (detail.success === false) return;

    client.linked = true;

    await syncClient();

    unlockClient();
    if (!client.rooms.has("wonk")) joinRoom("wonk");
});

function unlockClient() {
    messageInput.disabled = false;
}

function lockClient() {
    messageInput.disabled = true;
}

receiver.addEventListener("close", () => {
    lockClient();
});

async function syncClient() {
    let res = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/sync/me`
    });

    if (res.status !== 200) return; // TODO: handle this impossibility

    console.log("sync", res.data);

    for (let roomname in res.data.rooms) {
        let roomInfo = res.data.rooms[roomname];
        client.rooms.set(roomname, roomInfo);
        joinedRoomHandler(roomInfo);
    }
}

// TODO: add "destroy" event for when the client cant reconnect after 5 tries and will be redirected to a something went wrong page

/*

socket.on("leftRoom", (data) => {
    console.log("leftRoom", data);

    client.rooms.delete(data.room);

    navbarChannels.querySelector(`.navbar-channel[room="${data.room}"]`).remove();
    getMessagesContainer(data.room).remove();
    getMembersContainer(data.room).remove();

    if (client.rooms.size == 0) {
        chatnameEle.innerText = "";
        chatdescEle.innerText = "";
        messageInput.placeholder = `Message no one`;
        messageInput.disabled = true;
    } else {
        switchRooms(client.rooms.entries().next().value[1].name);
    }
});
*/

export async function joinRoom(roomname) {
    // socket.emit("joinRoom", room);

    let joinRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/join`
    });

    // TODO: add reject handler
    if (joinRes.status === 200) {
        joinedRoomHandler(joinRes.data);
    }
}

async function joinedRoomHandler(data) {
    console.log("joinedRoom", data);

    client.rooms.set(data.name, {
        name: data.name,
        description: data.description
    });

    // Add navbar channel button
    var chanEle = document.createElement("div");
    chanEle.setAttribute("room", data.name);
    chanEle.classList.add("navbar-channel");

    var nameEle = document.createElement("span");
    nameEle.classList.add("room-name");
    nameEle.innerText = `#${data.name}`;
    chanEle.appendChild(nameEle);

    var closeEle = document.createElement("img");
    closeEle.classList.add("no-select", "no-drag", "room-close");
    closeEle.src = "/icons/xmark-solid.svg";
    closeEle.addEventListener("click", () => {
        socket.emit("leaveRoom", data.name);
    });
    chanEle.appendChild(closeEle);

    chanEle.addEventListener("click", ({ target }) => {
        if (target === closeEle) return;
        switchRooms(data.name);
    });

    navbarChannels.appendChild(chanEle);

    // Add chatroom containers
    var msgCont = document.createElement("div");
    msgCont.classList.add("messages-container");
    msgCont.setAttribute("room", data.name);
    messagesWrapper.appendChild(msgCont);
    
    var memCont = document.createElement("div");
    memCont.classList.add("members-container");
    memCont.setAttribute("room", data.name);
    membersWrapper.appendChild(memCont);
    
    let membersRes = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/rooms/${data.name}/members`
    });

    setMembers(data.name, membersRes.data.members);

    switchRooms(data.name);
}

function addChatElement(ele, roomname = null) {
    var scroll = isAtBottomOfMessages();

    getMessagesContainer(roomname).appendChild(ele);

    if (scroll) {
        messagesWrapper.style["scroll-behavior"] = "unset";
        ele.scrollIntoView();
        messagesWrapper.style["scroll-behavior"] = "";
    }
}

function getMessagesContainer(roomname = null) {
    return messagesWrapper.querySelector(`.messages-container[room="${roomname === null ? client.currentRoom : roomname}"]`);
}

function switchRooms(roomname) {
    messagesWrapper.querySelectorAll(".messages-container").forEach(ele => {
        ele.classList.add("hidden");
    });
    membersWrapper.querySelectorAll(".members-container").forEach(ele => {
        ele.classList.add("hidden");
    });

    client.currentRoom = roomname;
    let roomInfo = client.rooms.get(roomname);

    chatnameEle.innerText = `#${roomInfo.name}`;
    chatdescEle.innerText = roomInfo.description;
    messageInput.placeholder = `Message ${roomInfo.name}`;
    messageInput.disabled = false;

    getMessagesContainer(roomname).classList.remove("hidden");
    getMembersContainer(roomname).classList.remove("hidden");
}

function isAtBottomOfMessages() {
    return messagesWrapper.scrollHeight - Math.ceil(messagesWrapper.scrollTop) <= messagesWrapper.clientHeight;
}

messageBox.addEventListener("click", ({ target }) => {
    if (target !== messageBox) return;
    messageInput.focus();
});

messageInput.addEventListener("keypress", ({ code, shiftKey }) => {
    if (code == "Enter" && !shiftKey) {
        sendMessage();
    }
});

sendButton.addEventListener("click", () => {
    sendMessage();
});

async function sendMessage() {
    if (messageInput.disabled) return;

    let content = messageInput.value;
    messageInput.value = "";

    while (attachmentsContainer.firstChild) {
        attachmentsContainer.removeChild(attachmentsContainer.firstChild);
    }

    let res = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${client.currentRoom}/message`,
        data: {
            content: content,
            attachments: client.attachments
        }
    });

    // TODO: handle bad requests

    client.attachments = [];
}

receiver.addEventListener("message", ({ detail }) => {
    console.log("message", detail);

    let ele = chatMessage(
        detail.author.username,
        detail.author.color,
        detail.author.discriminator,
        detail.content,
        detail.timestamp
    );

    addChatElement(ele, detail.room);
});

export {
    isAtBottomOfMessages,
    getMessagesContainer
}

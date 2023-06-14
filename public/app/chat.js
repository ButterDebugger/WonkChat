const messagesWrapper = document.getElementById("messages-wrapper");
const membersWrapper = document.getElementById("members-wrapper");
const sendButton = document.getElementById("send-button");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("messagebox");
export const messageInput = document.getElementById("message-input");

import {
    attachmentsContainer
} from "./attachments.js";

import {
    navbarChannels
} from "./navbar.js";

import {
    chatMessage
} from "./components.js";

import {
    getMembersContainer,
    setMembers
} from "./members.js";

import {
    client
} from "./client.js";

import { socket, receiver, makeRequest, gatewayUrl } from "./comms.js";

export function unlockChat() {
    messageInput.disabled = false;
}

export function lockChat() {
    messageInput.disabled = true;
}

export async function joinRoom(roomname) {
    // socket.emit("joinRoom", room);

    let joinRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/join`
    });

    if (joinRes.status === 200) {
        joinedRoomHandler(joinRes.data);
    } else if (joinRes.status === 400) {
        if (joinRes.data.code === 303) { // Room doesn't exist
            console.log("creating room");

            let createRes = await makeRequest({
                method: "post",
                url: `${gatewayUrl}/rooms/${roomname}/create`
            });

            if (!(createRes.status === 200 && createRes.data.success)) return; // TODO: handle this error

            joinRoom(roomname);
        }
    }
}

export async function joinedRoomHandler(data) {
    console.log("joinedRoom", data);

    client.rooms.set(data.name, {
        name: data.name,
        description: data.description
    });

    // Add navbar channel button
    let chanEle = document.createElement("div");
    chanEle.setAttribute("room", data.name);
    chanEle.classList.add("navbar-channel");

    let nameEle = document.createElement("span");
    nameEle.classList.add("room-name");
    nameEle.innerText = `#${data.name}`;
    chanEle.appendChild(nameEle);

    let closeEle = document.createElement("img");
    closeEle.classList.add("no-select", "no-drag", "room-close");
    closeEle.src = "/icons/xmark-solid.svg";
    closeEle.addEventListener("click", () => {
        leaveRoom(data.name);
    });
    chanEle.appendChild(closeEle);

    chanEle.addEventListener("click", ({ target }) => {
        if (target === closeEle) return;
        switchRooms(data.name);
    });

    navbarChannels.appendChild(chanEle);

    // Add chatroom containers
    let msgCont = document.createElement("div");
    msgCont.classList.add("messages-container");
    msgCont.setAttribute("room", data.name);
    messagesWrapper.appendChild(msgCont);
    
    let memCont = document.createElement("div");
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

async function leaveRoom(roomname) {
    let leaveRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/leave`
    });

    if (!(leaveRes.status === 200 && leaveRes.data.success)) return; // TODO: handle this error

    client.rooms.delete(roomname);

    navbarChannels.querySelector(`.navbar-channel[room="${roomname}"]`).remove();
    getMessagesContainer(roomname).remove();
    getMembersContainer(roomname).remove();

    if (client.rooms.size == 0) {
        chatnameEle.innerText = "";
        chatdescEle.innerText = "";
        messageInput.placeholder = `Message no one`;
        messageInput.disabled = true;
    } else {
        switchRooms(client.rooms.entries().next().value[1].name);
    }
}

function addChatElement(ele, roomname = null) {
    let scroll = isAtBottomOfMessages();

    getMessagesContainer(roomname).appendChild(ele);

    if (scroll) {
        messagesWrapper.style["scroll-behavior"] = "unset";
        ele.scrollIntoView();
        messagesWrapper.style["scroll-behavior"] = "";
    }
}

export function getMessagesContainer(roomname = null) {
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

export function isAtBottomOfMessages() {
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
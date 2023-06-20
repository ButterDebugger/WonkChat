const messagesWrapper = document.getElementById("messages-wrapper");
const sendButton = document.getElementById("send-button");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("message-box");
export const messageInput = document.getElementById("message-input");

import {
    clearAttachmentsBox
} from "./attachments.js";

import {
    addNavbarChannel,
    getNavbarChannel
} from "./navbar.js";

import {
    chatMessage
} from "./components.js";

import {
    addMembersContainer,
    getAllMembersContainers,
    getMembersContainer,
    setMembers
} from "./members.js";

import {
    client,
    debugMode
} from "./client.js";

import { receiver, makeRequest, gatewayUrl } from "./comms.js";

export function unlockChat() {
    messageInput.disabled = false;
}

export function lockChat() {
    messageInput.disabled = true;
}

export async function joinRoom(roomname) {
    let joinRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/join`
    });

    if (joinRes.status === 200) {
        joinedRoomHandler(joinRes.data);
    } else if (joinRes.status === 400) {
        if (joinRes.data.code === 303) { // Room doesn't exist
            if (debugMode) console.log("creating room", roomname);

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
    if (debugMode) console.log("joinedRoom", data);

    client.rooms.set(data.name, {
        name: data.name,
        description: data.description
    });

    // Add navbar channel button
    if (getNavbarChannel(data.name) === null) addNavbarChannel(data.name);

    // Add chatroom containers
    if (getMessagesContainer(data.name) === null) addMessagesContainer(data.name);
    if (getMembersContainer(data.name) === null) addMembersContainer(data.name);
    
    let membersRes = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/rooms/${data.name}/members`
    });

    setMembers(data.name, membersRes.data.members);

    switchRooms(data.name);
}

export async function leaveRoom(roomname) {
    let leaveRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/leave`
    });

    if (!(leaveRes.status === 200 && leaveRes.data.success)) return; // TODO: handle this error

    client.rooms.delete(roomname);

    getNavbarChannel(roomname).remove();
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

export function addChatElement(ele, roomname = null) {
    let scroll = isAtBottomOfMessages();

    getMessagesContainer(roomname).appendChild(ele);

    if (scroll) {
        messagesWrapper.style["scroll-behavior"] = "unset";
        ele.scrollIntoView();
        messagesWrapper.style["scroll-behavior"] = "";
    }
}

export function addMessagesContainer(roomname) {
    let msgCont = document.createElement("div");
    msgCont.classList.add("messages-container");
    msgCont.setAttribute("room", roomname);
    messagesWrapper.appendChild(msgCont);
}

export function getMessagesContainer(roomname = null) {
    return messagesWrapper.querySelector(`.messages-container[room="${roomname === null ? client.currentRoom : roomname}"]`);
}

export function getAllMessagesContainers() {
    return messagesWrapper.querySelectorAll(".messages-container");
}

export function switchRooms(roomname) {
    getAllMessagesContainers().forEach(ele => {
        ele.classList.add("hidden");
    });
    getAllMembersContainers().forEach(ele => {
        ele.classList.add("hidden");
    });

    client.currentRoom = roomname;
    let roomInfo = client.rooms.get(roomname);

    chatnameEle.innerText = `#${roomInfo.name}`;
    chatdescEle.innerText = roomInfo.description;
    messageInput.placeholder = `Message #${roomInfo.name}`;
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

    if (content.length > 1000 || content.replace(/\s/g, '').length == 0) return;
 
    messageInput.value = "";

    clearAttachmentsBox();

    // TODO: handle bad requests
    let messageRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${client.currentRoom}/message`,
        data: {
            content: content,
            attachments: client.attachments
        }
    });

    client.attachments = [];
}

receiver.addEventListener("message", ({ detail }) => {
    if (debugMode) console.log("message", detail);

    let ele = chatMessage(
        detail.author.username,
        detail.author.color,
        detail.author.discriminator,
        detail.content,
        detail.timestamp,
        detail.attachments
    );

    addChatElement(ele, detail.room);
});
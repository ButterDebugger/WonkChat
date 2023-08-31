const sendButton = document.getElementById("send-button");
const chattagEle = document.getElementById("chat-tag");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("message-box");
const messageInput = document.getElementById("message-input");
const attachBtn = document.getElementById("attach-button");

import {
    clearAttachmentsBox,
    isUploadingAttachments
} from "./attachments.js";
import {
    addNavbarChannel,
    getAllNavbarChannels,
    getNavbarChannel
} from "./navbar.js";
import {
    chatMessage, joinRoomMessage
} from "./components.js";
import {
    addMembersContainer,
    getMembersContainer,
    getMembersWrapper,
    removeMembersContainer,
    setMembers
} from "./members.js";
import {
    client,
    debugMode,
    getUsers
} from "./client.js";
import { makeRequest, gatewayUrl, parseData, registerEvent, isStreamOpen } from "./comms.js";
import showAlert from "./alert.js";
import * as cryption from "../../cryption.js";

const channelWrappers = new Map();
let isLocked = false;

function unlockChat() {
    messageInput.disabled = false;
    attachBtn.classList.remove("disabled");
    isLocked = false;
}

function lockChat() {
    messageInput.disabled = true;
    attachBtn.classList.add("disabled");
    isLocked = true;
}

export function updateChatLock() {
    if (isUploadingAttachments() || client.rooms.size == 0 || !isStreamOpen()) {
        lockChat();
    } else {
        unlockChat();
    }
}

export function isChatLocked() {
    return isLocked;
}

export async function joinRoom(roomname, suppressAlert = false) {
    let joinRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/join`
    });

    if (joinRes.status === 200) {
        await joinedRoomHandler(joinRes.data);
        
        let user = await getUsers(client.id);
        user = user.find(u => u.id === client.id) ?? null;

        if (user !== null) {
            addChatElement(joinRoomMessage(user.username, user.color, user.id, user.offline), joinRes.data.name);
        }
    } else {
        if (!suppressAlert) showAlert("Failed to join room", 2500);
    }

    return joinRes.data;
}

export async function createRoom(roomname, suppressAlert = false) {
    if (debugMode) console.log("creating room", roomname);

    let createRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/create`
    });

    if (!(createRes.status === 200 && createRes.data.success)) {
        if (!suppressAlert) showAlert("Failed to create new room", 2500);
        return false;
    }

    joinRoom(roomname);

    return true;
}

export async function joinedRoomHandler(data) {
    if (debugMode) console.log("joinedRoom", data);

    client.rooms.set(data.name, {
        name: data.name,
        description: data.description,
        key: data.key
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

export async function openDirectMessage(id) {
    showAlert("This has not been implemented yet.");
}

export async function leaveRoom(roomname) {
    let leaveRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${roomname}/leave`
    });

    if (!(leaveRes.status === 200 && leaveRes.data.success)) return showAlert("Failed to leave room", 2500);

    client.rooms.delete(roomname);

    getNavbarChannel(roomname).remove();
    removeMessagesContainer(roomname);
    removeMembersContainer(roomname);

    if (client.rooms.size == 0) {
        chattagEle.classList.add("hidden");
        chattagEle.src = "";
        chatnameEle.innerText = "";
        chatdescEle.innerText = "";
        messageInput.placeholder = "Message no one";
        client.currentRoom = null;
        updateChatLock();
        updatePageTitle();
    } else if (client.currentRoom === roomname) {
        switchRooms(client.rooms.entries().next().value[1].name);
    }
}

export function addChatElement(ele, roomname = null) {
    let scroll = isAtBottomOfMessages();
    let msgsContainer = getMessagesContainer(roomname);

    let timestampEle = ele.querySelector(".timestamp[data-time]");
    let time = parseInt(timestampEle.getAttribute("data-time"));
    let stampElements = Array.from(msgsContainer.querySelectorAll(".timestamp[data-time]"));

    let timestamps = stampElements.map(ele => parseInt(ele.getAttribute("data-time")));
    let index = timestamps.findIndex(stamp => stamp > time);

    if (index == -1) {
        msgsContainer.appendChild(ele);
    } else {
        let next = stampElements[index];
        while (next.parentElement !== msgsContainer) {
            next = next.parentElement;
        }
        next.insertAdjacentElement("beforebegin", ele);
    }

    if (scroll) {
        let messagesWrapper = getMessagesWrapper();
        messagesWrapper.style["scroll-behavior"] = "unset";
        ele.scrollIntoView();
        messagesWrapper.style["scroll-behavior"] = "";
    }
}

export function addMessagesContainer(roomname) {
    let msgsWrapper = document.createElement("div");
    msgsWrapper.id = "messages-wrapper";
    msgsWrapper.setAttribute("room", roomname);
    channelWrappers.set(`#${roomname}`, msgsWrapper);
}

export function getMessagesContainer(roomname) {
    return channelWrappers.get(`#${roomname}`) ?? null;
}

export function removeMessagesContainer(roomname) {
    return channelWrappers.delete(`#${roomname}`);
}

function getMessagesWrapper() {
    return document.getElementById("messages-wrapper");
}

export function getAllChannelWrappers() {
    return Array.from(channelWrappers.values());
}

export function switchRooms(roomname) {
    getAllNavbarChannels().forEach(ele => {
        ele.classList.remove("active");
    });

    client.currentRoom = roomname;
    let roomInfo = client.rooms.get(roomname);

    chattagEle.classList.remove("hidden");
    chattagEle.src = "/icons/hashtag-solid.svg";
    chatnameEle.innerText = `${roomInfo.name}`;
    chatdescEle.innerText = roomInfo.description;
    messageInput.placeholder = `Message #${roomInfo.name}`;

    getMessagesWrapper().replaceWith(getMessagesContainer(roomname));
    getMembersWrapper().replaceWith(getMembersContainer(roomname));

    getNavbarChannel(roomname).classList.add("active");

    updatePageTitle();
}

function updatePageTitle() {
    if (client.currentRoom === null) {
        document.title = "Wonk Chat";
    } else {
        document.title = `#${client.currentRoom} • Wonk Chat`;
    }
}

export function isAtBottomOfMessages() {
    let messagesWrapper = getMessagesWrapper();
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
    let room = client.rooms.get(client.currentRoom);

    if (content.length > 1000 || content.replace(/\s/g, '').length == 0) return;
 
    messageInput.value = "";
    clearAttachmentsBox();

    let messageRes = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${client.currentRoom}/message`,
        data: {
            message: await cryption.encrypt(JSON.stringify({
                content: content,
                attachments: client.attachments
            }), room.key)
        }
    });

    if (messageRes.status !== 200) return showAlert("Failed to send message", 2500);

    client.attachments = [];
}

registerEvent("message", ({ data }) => {
    data = parseData(data);
    if (typeof data == "undefined") return;

    if (debugMode) console.log("message", data);

    let ele = chatMessage(
        data.author.username,
        data.author.color,
        data.author.id,
        data.author.offline,
        data.content,
        data.timestamp,
        data.attachments
    );

    addChatElement(ele, data.room);
});
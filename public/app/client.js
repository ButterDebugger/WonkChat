const messagesWrapper = document.getElementById("messages-wrapper");
const membersWrapper = document.getElementById("members-wrapper");
const sendButton = document.getElementById("send-button");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("messagebox");
export const messageInput = document.getElementById("message-input");

import { getCookies } from "https://butterycode.com/static/js/utils.js@1.2?min";

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

initAttachments();
initNavbar();

import { socket, receiver, makeRequest, gatewayUrl } from "./comms.js";

export let client = {
    linked: false,
    currentRoom: null,
    roomInfo: new Map(),
    rooms: [],
    attachments: []
};

receiver.addEventListener("link", ({ detail }) => {
    if (detail.success === false) return;

    client.linked = true;

    unlockClient();
    joinRoom("#wonk");
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

// TODO: add "destroy" event for when the client cant reconnect after 5 tries or something

/*socket.on("updateMembers", (data) => {
    console.log("updateMembers", data);
    
    var members = getMembersContainer(data.room);
    
    while (members.firstChild) {
        members.removeChild(members.firstChild);
    }

    data.members.forEach(user => {
        if (user.new) {
            var newEle = document.createElement("div");

            var nameEle = document.createElement("span");
            nameEle.innerText = `${user.username}`;
            nameEle.style.color = user.color;
            newEle.appendChild(nameEle);
        
            var contEle = document.createElement("span");
            contEle.innerText = " has joined the chat";
            contEle.style.color = "rgba(255, 255, 255, 0.6)";
            newEle.appendChild(contEle);
        
            addChatElement(newEle, data.room);
        } else if (user.left) {
            var leftEle = document.createElement("div");

            var nameEle = document.createElement("span");
            nameEle.innerText = `${user.username}`;
            nameEle.style.color = user.color;
            leftEle.appendChild(nameEle);
        
            var contEle = document.createElement("span");
            contEle.innerText = " has left the chat";
            contEle.style.color = "rgba(255, 255, 255, 0.6)";
            leftEle.appendChild(contEle);

            addChatElement(leftEle, data.room);
            return; // Cancel adding member to member list
        }

        var memEle = document.createElement("div");

        var nameEle = document.createElement("span");
        nameEle.innerText = `${user.username}`;
        nameEle.style.color = user.color;
        memEle.appendChild(nameEle);

        var discEle = document.createElement("span");
        discEle.innerText = `#${user.discriminator}`;
        discEle.style.color = "rgba(255, 255, 255, 0.2)";
        memEle.appendChild(discEle);
    
        members.appendChild(memEle);
    });
});

socket.on("joinedRoom", (data) => {
    console.log("joinedRoom", data);

    client.rooms.push(data.room);
    client.roomInfo.set(data.room, {
        room: data.room,
        description: data.description
    });

    // Add navbar channel button
    var chanEle = document.createElement("div");
    chanEle.setAttribute("room", data.room);
    chanEle.classList.add("navbar-channel");

    var nameEle = document.createElement("span");
    nameEle.classList.add("room-name");
    nameEle.innerText = `${data.room}`;
    chanEle.appendChild(nameEle);

    var closeEle = document.createElement("img");
    closeEle.classList.add("no-select", "no-drag", "room-close");
    closeEle.src = "/icons/xmark-solid.svg";
    closeEle.addEventListener("click", () => {
        socket.emit("leaveRoom", data.room);
    });
    chanEle.appendChild(closeEle);

    chanEle.addEventListener("click", ({ target }) => {
        if (target === closeEle) return;
        switchRooms(data.room);
    });

    navbarChannels.appendChild(chanEle);

    // Add chatroom containers
    var msgCont = document.createElement("div");
    msgCont.classList.add("messages-container");
    msgCont.setAttribute("room", data.room);
    messagesWrapper.appendChild(msgCont);
    
    var memCont = document.createElement("div");
    memCont.classList.add("members-container");
    memCont.setAttribute("room", data.room);
    membersWrapper.appendChild(memCont);

    switchRooms(data.room);
});

socket.on("leftRoom", (data) => {
    console.log("leftRoom", data);

    client.rooms = client.rooms.filter(room => room !== data.room);
    client.roomInfo.delete(data.room);

    navbarChannels.querySelector(`.navbar-channel[room="${data.room}"]`).remove();
    getMessagesContainer(data.room).remove();
    getMembersContainer(data.room).remove();

    if (client.rooms == 0) {
        chatnameEle.innerText = "";
        chatdescEle.innerText = "";
        messageInput.placeholder = `Message no one`;
        messageInput.disabled = true;
    } else {
        switchRooms(client.rooms[0]);
    }
});

socket.on("message", (data) => {

    let ele = chatMessage(
        data.author.username,
        data.author.color,
        data.author.discriminator,
        data.content,
        Date.now() // TODO: make more accurate
    );

    addChatElement(ele, data.room);

    console.log("message", data);
});*/

export async function joinRoom(room) {
    // socket.emit("joinRoom", room);

    let res = await makeRequest({
        method: "post",
        url: `${gatewayUrl}/rooms/${room}/join`
    }).catch(() => {});
}

function addChatElement(ele, room = null) {
    var scroll = isAtBottomOfMessages();

    getMessagesContainer(room).appendChild(ele);

    if (scroll) {
        messagesWrapper.style["scroll-behavior"] = "unset";
        ele.scrollIntoView();
        messagesWrapper.style["scroll-behavior"] = "";
    }
}

function getMessagesContainer(room = null) {
    return messagesWrapper.querySelector(`.messages-container[room="${room === null ? client.currentRoom : room}"]`);
}

function getMembersContainer(room = null) {
    return membersWrapper.querySelector(`.members-container[room="${room === null ? client.currentRoom : room}"]`);
}

function switchRooms(room) {
    messagesWrapper.querySelectorAll(".messages-container").forEach(ele => {
        ele.classList.add("hidden");
    });
    membersWrapper.querySelectorAll(".members-container").forEach(ele => {
        ele.classList.add("hidden");
    });

    client.currentRoom = room;
    var roomInfo = client.roomInfo.get(room);

    chatnameEle.innerText = roomInfo.room;
    chatdescEle.innerText = roomInfo.description;
    messageInput.placeholder = `Message ${roomInfo.room}`;
    messageInput.disabled = false;

    getMessagesContainer(room).classList.remove("hidden");
    getMembersContainer(room).classList.remove("hidden");
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

function sendMessage() {
    if (messageInput.disabled) return;

    var content = messageInput.value;
    messageInput.value = "";

    while (attachmentsContainer.firstChild) {
        attachmentsContainer.removeChild(attachmentsContainer.firstChild);
    }

    socket.emit("message", {
        content: content,
        room: client.currentRoom,
        attachments: client.attachments
    });

    client.attachments = [];
}

export {
    isAtBottomOfMessages,
    getMessagesContainer,
    getMembersContainer
}
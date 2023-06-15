const membersShow = document.getElementById("members-show");
const membersWrapper = document.getElementById("members-wrapper");

import {
    client,
    getUsers,
    debugMode
} from "./client.js";

import {
    userDisplay,
    timestampComponent
} from "./components.js"

import {
    addChatElement
} from "./chat.js"

import { receiver } from "./comms.js";

let roomMembersCache = new Map();

tippy(membersShow, {
    content: "Toggle Member List"
});

membersShow.addEventListener("click", () => {
    membersWrapper.classList.toggle("hidden");
});

receiver.addEventListener("updateMember", async ({ detail }) => {
    if (debugMode) console.log("updateMember", detail);

    let membersCache = roomMembersCache.get(detail.room) ?? new Set();

    if (detail.state === "join") {
        let user = await getUsers(detail.id);
        user = user.find(u => u.id === detail.id) ?? null;
        
        if (user !== null) {
            let newEle = document.createElement("div");
            newEle.classList.add("message");

            newEle.appendChild(timestampComponent(Date.now()));
            newEle.appendChild(userDisplay(user.username, user.color, user.discriminator));

            let contEle = document.createElement("span");
            contEle.classList.add("notification");
            contEle.innerText = " has joined the chat";
            newEle.appendChild(contEle);
        
            addChatElement(newEle, detail.room);
        }

        membersCache.add(detail.id);
        setMembers(detail.room, Array.from(membersCache));
    } else if (detail.state === "leave") {
        let user = await getUsers(detail.id);
        user = user.find(u => u.id === detail.id) ?? null;
        
        if (user !== null) {
            let leftEle = document.createElement("div");
            leftEle.classList.add("message");

            leftEle.appendChild(timestampComponent(Date.now()));
            leftEle.appendChild(userDisplay(user.username, user.color, user.discriminator));
        
            let contEle = document.createElement("span");
            contEle.classList.add("notification");
            contEle.innerText = " has left the chat";
            leftEle.appendChild(contEle);

            addChatElement(leftEle, detail.room);
        }

        membersCache.delete(detail.id);
        setMembers(detail.room, Array.from(membersCache));
    }
});

export async function setMembers(roomname, ids) {
    if (debugMode) console.log("setting member list", ids);

    roomMembersCache.set(roomname, new Set(ids));
    
    let members = await getUsers(ids);
    let membersContainer = getMembersContainer(roomname);
    
    while (membersContainer.firstChild) {
        membersContainer.removeChild(membersContainer.firstChild);
    }

    members.forEach(user => {
        membersContainer.appendChild(userDisplay(user.username, user.color, user.discriminator, true));
    });
};

export function getMembersContainer(roomname = null) {
    return membersWrapper.querySelector(`.members-container[room="${roomname === null ? client.currentRoom : roomname}"]`);
}

const membersShow = document.getElementById("members-show");
const membersWrapper = document.getElementById("members-wrapper");

import {
    client,
    getUsers,
    debugMode
} from "./client.js";
import {
    userDisplay,
    timestampComponent,
    leaveRoomMessage,
    joinRoomMessage
} from "./components.js"
import {
    addChatElement
} from "./chat.js"
import { parseData, registerEvent } from "./comms.js";

let roomMembersCache = new Map();

tippy(membersShow, {
    content: "Toggle Member List"
});

membersShow.addEventListener("click", () => {
    membersWrapper.classList.toggle("hidden");
});

registerEvent("updateMember", async ({ data }) => {
    data = parseData(data);

    if (typeof data == "undefined") return;
    if (debugMode) console.log("update member", data);

    let membersCache = roomMembersCache.get(data.room) ?? new Set();

    switch (data.state) {
        case "join": {
            let user = await getUsers(data.id);
            user = user.find(u => u.id === data.id) ?? null;

            if (user !== null) {
                addChatElement(joinRoomMessage(user.username, user.color, user.id, user.offline), data.room);
            }
    
            membersCache.add(data.id);
            setMembers(data.room, Array.from(membersCache));
            break;
        }
        case "leave": {
            let user = await getUsers(data.id);
            user = user.find(u => u.id === data.id) ?? null;
            
            if (user !== null) {
                addChatElement(leaveRoomMessage(user.username, user.color, user.id, user.offline), data.room);
            }
    
            membersCache.delete(data.id);
            setMembers(data.room, Array.from(membersCache));
            break;
        }
        default:
            break;
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
        let userEle = userDisplay(user.username, user.color, user.id, user.offline);
        membersContainer.appendChild(userEle);
    });
};

export function addMembersContainer(roomname) {
    let memCont = document.createElement("div");
    memCont.classList.add("members-container");
    memCont.setAttribute("room", roomname);
    membersWrapper.appendChild(memCont);
}

export function getMembersContainer(roomname = null) {
    return membersWrapper.querySelector(`.members-container[room="${roomname === null ? client.currentRoom : roomname}"]`);
}

export function getAllMembersContainers() {
    return membersWrapper.querySelectorAll(".members-container");
}

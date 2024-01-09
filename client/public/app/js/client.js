import "./attachments.js";
import "./navbar.js";
import {
    getAllChannelWrappers,
    joinRoom,
    joinedRoomHandler,
    updateChatLock
} from "./chat.js";
import { makeRequest, gatewayUrl, parseData, registerEvent, init as initComms } from "./comms.js";
import showAlert from "./alert.js";
import { userDisplay } from "./components.js";
import * as binForage from "https://debutter.dev/x/js/binforage.js";
import { getAllMemberWrappers } from "./members.js";

export let userCache = new Map();
export let debugMode = false;
export let client = {
    id: null,
    currentRoom: null,
    rooms: new Map(),
    attachments: [],
    keyPair: await binForage.get("login[keyPair]")
};

initComms();

registerEvent("open", async () => {
    await syncClient();

    if (!client.rooms.has("wonk")) joinRoom("wonk");

    await syncMemory();

    updateChatLock();
});

registerEvent("close", () => {
    updateChatLock();
});

async function syncClient() {
    let syncRes = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/sync/client`
    });

    if (syncRes.status !== 200) return showAlert("Failed to sync client", 2500);

    if (debugMode) console.log("sync client", syncRes.data);

    client.id = syncRes.data.you.id;
    client.rooms.clear();

    for (let room of syncRes.data.rooms) {
        client.rooms.set(room.name, room);
        joinedRoomHandler(room);
    }
}

async function syncMemory() {
    let syncRes = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/sync/memory`
    });

    if (syncRes.status !== 200) return showAlert("Failed to sync memory", 2500);

    if (debugMode) console.log("sync memory");
}

registerEvent("updateUser", ({ data }) => {
    data = parseData(data);
    if (typeof data == "undefined") return;

    let cacheTime = userCache.get(data.id)?.cacheTime ?? 0;

    if (data.timestamp > cacheTime) {
        userCache.set(data.id, Object.assign(data.data, {
            cacheTime: data.timestamp
        }));
        
        // Dynamically update all elements
        updateUserDynamically(data.data.username, data.data.color, data.data.id, data.data.offline);
    }
});

function updateUserDynamically(username, color, id, offline) {
    [document, getAllChannelWrappers(), getAllMemberWrappers()].flat().forEach(ele => {
        ele.querySelectorAll(`.username[data-id="${id}"]`).forEach((ele) => {
            ele.replaceWith(userDisplay(username, color, id, offline));
        });
    });
}

export async function getUsers(...ids) {
    let users = [];
    let unknowns = [];

    ids.forEach(id => {
        if (userCache.has(id)) {
            users.push(userCache.get(id));
        } else {
            unknowns.push(id);
        }
    });

    if (unknowns.length > 0) {
        let usersRes = await makeRequest({
            method: "get",
            url: `${gatewayUrl}/users/?subscribe=yes&ids=${unknowns.join(",")}`
        });

        if (usersRes.status == 200) {
            usersRes.data.users.forEach(user => {
                users.push(user);
                userCache.set(user.id, Object.assign(user, {
                    cacheTime: Date.now()
                }));
                updateUserDynamically(user.username, user.color, user.id, user.offline);
            });
        }
    }

    return users;
}

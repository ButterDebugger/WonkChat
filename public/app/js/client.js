import "./attachments.js";
import "./navbar.js";
import {
    joinRoom,
    joinedRoomHandler,
    updateChatLock
} from "./chat.js";
import { makeRequest, gatewayUrl, parseData, registerEvent } from "./comms.js";
import showAlert from "./alert.js";

export let userCache = new Map();
export let debugMode = false;
export let client = {
    currentRoom: null,
    rooms: new Map(),
    attachments: []
};

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

    client.rooms.clear();

    for (let roomname in syncRes.data.rooms) {
        let roomInfo = syncRes.data.rooms[roomname];
        client.rooms.set(roomname, roomInfo);
        joinedRoomHandler(roomInfo);
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

    userCache.set(data.id, data.data);
});

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
                userCache.set(user.id, user);
            });
        }
    }

    return users;
}

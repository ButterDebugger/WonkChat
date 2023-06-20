import "./attachments.js";

import "./navbar.js";

import {
    lockChat,
    unlockChat,
    joinRoom,
    joinedRoomHandler
} from "./chat.js";

import { receiver, makeRequest, gatewayUrl } from "./comms.js";

import showAlert from "./alert.js";

export let userCache = new Map();
export let debugMode = false;
export let client = {
    currentRoom: null,
    rooms: new Map(),
    attachments: []
};

receiver.addEventListener("open", async () => {
    await syncClient();

    unlockChat();
    if (!client.rooms.has("wonk")) joinRoom("wonk");
});

receiver.addEventListener("close", () => {
    lockChat();
});

async function syncClient() {
    let syncRes = await makeRequest({
        method: "get",
        url: `${gatewayUrl}/sync/me`
    });

    if (syncRes.status !== 200) return showAlert("Failed to sync client", 2500);

    if (debugMode) console.log("sync", syncRes.data);

    for (let roomname in syncRes.data.rooms) {
        let roomInfo = syncRes.data.rooms[roomname];
        client.rooms.set(roomname, roomInfo);
        joinedRoomHandler(roomInfo);
    }
}

receiver.addEventListener("updateUser", ({ detail }) => {
    userCache.set(detail.id, detail.data);
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

const messagesWrapper = document.getElementById("messages-wrapper");
const membersWrapper = document.getElementById("members-wrapper");
const sendButton = document.getElementById("send-button");
const chatnameEle = document.getElementById("chat-name");
const chatdescEle = document.getElementById("chat-description");
const messageBox = document.getElementById("messagebox");
const messageInput = document.getElementById("message-input");

import {
    init as initAttachments
} from "./attachments.js";

import {
    init as initNavbar
} from "./navbar.js";

import {
    lockChat,
    unlockChat,
    joinRoom,
    joinedRoomHandler
} from "./chat.js";

initAttachments();
initNavbar();

import { receiver, makeRequest, gatewayUrl } from "./comms.js";

export let userCache = new Map();
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

    unlockChat();
    if (!client.rooms.has("wonk")) joinRoom("wonk");
});

receiver.addEventListener("close", () => {
    lockChat();
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
            url: `${gatewayUrl}/users/?ids=${unknowns.join(",")}`
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

// TODO: add "destroy" event for when the client cant reconnect after 5 tries and will be redirected to a something went wrong page

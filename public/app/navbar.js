const joinRoomModalEle = document.getElementById("join-room-modal");
const joinRoomInput = document.getElementById("join-room-input");
const joinRoomButton = document.getElementById("join-room-button");
const joinRoomHeader = document.getElementById("join-room-header");
const navbarJoinRoomEle = document.getElementById("navbar-join-room");
const navbarSignOutButton = document.getElementById("navbar-log-out");
const navbarBars = document.getElementById("navbar-bars");
const navbarEle = document.getElementById("navbar");
const navbarChannels = document.getElementById("navbar-channels");

import { createRoom, joinRoom, leaveRoom, switchRooms } from "./chat.js";
import { closeModal, openModal } from "./modal.js";

let joinRoomAction = "join";

navbarSignOutButton.addEventListener("click", () => {
    location.href = "/logout";
});

navbarJoinRoomEle.addEventListener("click", () => {
    joinRoomHeader.innerText = "Join a Room";
    joinRoomButton.src = "../icons/right-to-bracket-solid.svg";
    joinRoomAction = "join";

    openModal(joinRoomModalEle, 40);
});

joinRoomInput.addEventListener("keypress", ({ code }) => {
    if (code == "Enter") {
        join();
    }
});
joinRoomButton.addEventListener("click", () => {
    join();
});

navbarBars.addEventListener("click", () => {
    openModal(navbarEle, 20);
});

window.addEventListener("resize", () => {
    closeModal(navbarEle);
});

async function join() {
    let roomname = joinRoomInput.value;

    if (
        roomname.length < 3 ||
        roomname.length > 16 ||
        roomname.replace(/[a-z0-9_]*/g, '').length !== 0
    ) return;

    if (joinRoomAction == "join") {
        let result = await joinRoom(roomname, true);

        if (result.error && result.code === 303) {
            joinRoomHeader.innerText = "Create a New Room";
            joinRoomButton.src = "../icons/square-plus-solid.svg";
            joinRoomAction = "create";
        } else {
            joinRoomInput.value = "";
            closeModal(joinRoomModalEle);
        }
    } else if (joinRoomAction == "create") {
        await createRoom(roomname);

        joinRoomInput.value = "";
        closeModal(joinRoomModalEle);
    }
}

export function addNavbarChannel(roomname) {
    let chanEle = document.createElement("div");
    chanEle.setAttribute("room", roomname);
    chanEle.classList.add("navbar-channel");

    let tagEle = document.createElement("img");
    tagEle.classList.add("no-select", "no-drag", "nav-tag");
    tagEle.src = "/icons/hashtag-solid.svg";
    chanEle.appendChild(tagEle);

    let nameEle = document.createElement("span");
    nameEle.classList.add("room-name");
    nameEle.innerText = `${roomname}`;
    chanEle.appendChild(nameEle);

    let closeEle = document.createElement("img");
    closeEle.classList.add("no-select", "no-drag", "room-close");
    closeEle.src = "/icons/xmark-solid.svg";
    closeEle.addEventListener("click", () => {
        leaveRoom(roomname);
    });
    chanEle.appendChild(closeEle);

    chanEle.addEventListener("click", ({ target }) => {
        if (target === closeEle) return;
        switchRooms(roomname);
    });

    navbarChannels.appendChild(chanEle);
}

export function getNavbarChannel(roomname) {
    return navbarChannels.querySelector(`.navbar-channel[room="${roomname}"]`);
}

export function getAllNavbarChannels() {
    return navbarChannels.querySelectorAll(".navbar-channel");
}

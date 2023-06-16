const navbarJoinRoomInput = document.getElementById("navbar-join-room");
const navbarJoinRoomButton = document.getElementById("navbar-join-room-button");
const navbarBars = document.getElementById("navbar-bars");
const navbarEle = document.getElementById("navbar");
const navbarChannels = document.getElementById("navbar-channels");

import { isChildOf } from "https://butterycode.com/static/js/utils.js@1.2";
import { joinRoom, leaveRoom, switchRooms } from "./chat.js";

navbarJoinRoomInput.addEventListener("keypress", ({ code }) => {
    if (code == "Enter") {
        join();
    }
});

navbarJoinRoomButton.addEventListener("click", () => {
    join();
});

document.addEventListener("click", ({ target }) => {
    if (!(target === navbarEle || target === navbarBars || isChildOf(target, navbarEle))) {
        navbarEle.classList.remove("pulled-out");
    }
});

navbarBars.addEventListener("click", () => {
    navbarEle.classList.add("pulled-out");
});

window.addEventListener("resize", () => {
    navbarEle.classList.remove("pulled-out");
});

function join() {
    let roomname = navbarJoinRoomInput.value;

    if (
        roomname.length < 3 ||
        roomname.length > 16 ||
        roomname.replace(/[a-z0-9_]*/g, '').length !== 0
    ) return;

    navbarJoinRoomInput.value = "";

    joinRoom(roomname);
}

export function addNavbarChannel(roomname) {
    let chanEle = document.createElement("div");
    chanEle.setAttribute("room", roomname);
    chanEle.classList.add("navbar-channel");

    let nameEle = document.createElement("span");
    nameEle.classList.add("room-name");
    nameEle.innerText = `#${roomname}`;
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

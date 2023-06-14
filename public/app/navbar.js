const navbarJoinRoomInput = document.getElementById("navbar-join-room");
const navbarJoinRoomButton = document.getElementById("navbar-join-room-button");
const navbarBars = document.getElementById("navbar-bars");
const navbarEle = document.getElementById("navbar");
export const navbarChannels = document.getElementById("navbar-channels");

import { isChildOf } from "https://butterycode.com/static/js/utils.js@1.2";
import { joinRoom } from "./chat.js";

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


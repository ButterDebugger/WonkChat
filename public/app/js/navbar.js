const joinRoomModalEle = document.getElementById("join-room-modal");
const joinRoomInput = document.getElementById("join-room-input");
const joinRoomButton = document.getElementById("join-room-button");
const joinRoomHeader = document.getElementById("join-room-header");
const navbarBars = document.getElementById("navbar-bars");
const navbarEle = document.getElementById("navbar");
const navbarChannels = document.getElementById("navbar-channels");
const navbarControls = document.getElementById("navbar-controls");

import { createRoom, joinRoom, leaveRoom, switchRooms } from "./chat.js";
import { closeModal, openModal } from "./modal.js";

let joinRoomAction = "join";

addNavbarControl("../icons/power-off-solid.svg", "Log out").addEventListener("click", () => {
    location.href = "/logout";
});

addNavbarControl("../icons/plus-solid.svg", "Join a room").addEventListener("click", () => {
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
    navbarEle.classList.toggle("expand");
    updateTooltips(!navbarEle.classList.contains("expand"));
});

window.addEventListener("resize", () => {
    updateTooltips(!navbarEle.classList.contains("expand"));
});
window.addEventListener("load", () => {
    if (window.innerWidth <= 980) {
        navbarEle.classList.remove("expand");
    } else {
        navbarEle.classList.add("expand");
    }

    updateTooltips(!navbarEle.classList.contains("expand"));
});

function updateTooltips(state) {
    getAllNavbarChannels().forEach(ele => {
        ele.tooltip[state ? "enable" : "disable"]();
    });
    getAllNavbarControls().forEach(ele => {
        ele.tooltip[state ? "enable" : "disable"]();
    });
}

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

export function addNavbarControl(iconSrc, text) {
    let contEle = document.createElement("div");
    contEle.classList.add("navbar-control");

    contEle.tooltip = tippy(contEle, {
        content: text,
        placement: "right",
        hideOnClick: false
    });
    if (navbarEle.classList.contains("expand")) contEle.tooltip.disable();

    let tagEle = document.createElement("img");
    tagEle.classList.add("no-select", "no-drag", "nav-tag");
    tagEle.src = iconSrc;
    contEle.appendChild(tagEle);

    let textEle = document.createElement("span");
    textEle.classList.add("nav-control-text");
    textEle.innerText = `${text}`;
    contEle.appendChild(textEle);

    navbarControls.prepend(contEle);
    return contEle;
}

export function addNavbarChannel(roomname) {
    let chanEle = document.createElement("div");
    chanEle.setAttribute("room", roomname);
    chanEle.classList.add("navbar-channel");

    chanEle.tooltip = tippy(chanEle, {
        content: roomname,
        placement: "right",
        hideOnClick: false
    });
    if (navbarEle.classList.contains("expand")) chanEle.tooltip.disable();

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

function getAllNavbarControls() {
    return navbarControls.querySelectorAll(".navbar-control");
}

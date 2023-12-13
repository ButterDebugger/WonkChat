import { createRoomTab } from "./components.js";
import { client } from "./main.js";

const exploreDrawer = document.getElementById("explore-drawer");
const roomsDrawer = document.getElementById("rooms-drawer");
const messagesDrawer = document.getElementById("messages-drawer");

const navExploreBtn = document.getElementById("nav-explore");
const navRoomsBtn = document.getElementById("nav-rooms");
const navMessagesBtn = document.getElementById("nav-messages");
const navYouBtn = document.getElementById("nav-you");

navExploreBtn.addEventListener("click", () => {
    exploreDrawer.classList.remove("hidden");
    roomsDrawer.classList.add("hidden");
    messagesDrawer.classList.add("hidden");

    navExploreBtn.classList.add("active");
    navRoomsBtn.classList.remove("active");
    navMessagesBtn.classList.remove("active");
    navYouBtn.classList.remove("active");
});
navRoomsBtn.addEventListener("click", () => {
    roomsDrawer.classList.remove("hidden");
    exploreDrawer.classList.add("hidden");
    messagesDrawer.classList.add("hidden");

    navRoomsBtn.classList.add("active");
    navExploreBtn.classList.remove("active");
    navMessagesBtn.classList.remove("active");
    navYouBtn.classList.remove("active");
});
navMessagesBtn.addEventListener("click", () => {
    messagesDrawer.classList.remove("hidden");
    roomsDrawer.classList.add("hidden");
    exploreDrawer.classList.add("hidden");

    navMessagesBtn.classList.add("active");
    navRoomsBtn.classList.remove("active");
    navExploreBtn.classList.remove("active");
    navYouBtn.classList.remove("active");
});
navYouBtn.addEventListener("click", () => {
    // TODO: add drawer

    navMessagesBtn.classList.remove("active");
    navRoomsBtn.classList.remove("active");
    navExploreBtn.classList.remove("active");
    navYouBtn.classList.add("active");
});

export function updateRoomTabs() {
    let roomsContainer = roomsDrawer.querySelector(".content");

    for (let room of client.rooms.cache.values()) {
        roomsContainer.appendChild(createRoomTab(room.name));
    }
}
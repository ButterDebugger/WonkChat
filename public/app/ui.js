import { createRoomTab } from "./components.js";
import { client } from "./main.js";
import { getOrCreateRoomWrapper } from "./views.js";

const exploreDrawer = document.getElementById("explore-drawer");
const roomsDrawer = document.getElementById("rooms-drawer");
const messagesDrawer = document.getElementById("messages-drawer");
const youDrawer = document.getElementById("you-drawer");
const viewDrawer = document.getElementById("view-wrapper");

const navExploreBtn = document.getElementById("nav-explore");
const navRoomsBtn = document.getElementById("nav-rooms");
const navMessagesBtn = document.getElementById("nav-messages");
const navYouBtn = document.getElementById("nav-you");

navExploreBtn.addEventListener("click", () => {
    switchDrawer("explore");
});
navRoomsBtn.addEventListener("click", () => {
    switchDrawer("rooms");
});
navMessagesBtn.addEventListener("click", () => {
    switchDrawer("messages");
});
navYouBtn.addEventListener("click", () => {
    switchDrawer("you");
});

export function switchDrawer(drawerName) {
    // Show / hide drawers
    messagesDrawer.classList [drawerName == "messages" ? "remove" : "add"]("hidden");
    roomsDrawer.classList    [drawerName == "rooms"    ? "remove" : "add"]("hidden");
    exploreDrawer.classList  [drawerName == "explore"  ? "remove" : "add"]("hidden");
    youDrawer.classList      [drawerName == "you"      ? "remove" : "add"]("hidden");
    viewDrawer.classList     [drawerName == "view"     ? "remove" : "add"]("hidden");

    // Only change the active button if a it can be switched
    if (["messages", "rooms", "explore", "you"].includes(drawerName)) {
        navMessagesBtn.classList[drawerName == "messages" ? "add" : "remove"]("active");
        navRoomsBtn.classList   [drawerName == "rooms"    ? "add" : "remove"]("active");
        navExploreBtn.classList [drawerName == "explore"  ? "add" : "remove"]("active");
        navYouBtn.classList     [drawerName == "you"      ? "add" : "remove"]("active");
    }
}

export function updateRoomTabs() {
    let roomsContainer = roomsDrawer.querySelector(".content");

    for (let room of client.rooms.cache.values()) {
        let ele = createRoomTab(room.name);
        getOrCreateRoomWrapper(room);

        ele.addEventListener("click", () => {
            switchDrawer("view");

            let wrapper = getOrCreateRoomWrapper(room);
            viewDrawer.querySelector(".header").replaceWith(wrapper.header);
            viewDrawer.querySelector(".content").replaceWith(wrapper.content);
            viewDrawer.querySelector(".footer").replaceWith(wrapper.footer);

            // Scroll to the bottom
            wrapper.content.scrollTop = wrapper.content.scrollHeight;
        });
        
        roomsContainer.appendChild(ele);
    }
}
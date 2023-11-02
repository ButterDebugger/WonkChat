const exploreDrawer = document.getElementById("explore-drawer");
const roomsDrawer = document.getElementById("rooms-drawer");
const messagesDrawer = document.getElementById("messages-drawer");

const navExploreBtn = document.getElementById("nav-explore");
const navRoomsBtn = document.getElementById("nav-rooms");
const navMessagesBtn = document.getElementById("nav-messages");

navExploreBtn.addEventListener("click", () => {
    exploreDrawer.classList.remove("hidden");
    roomsDrawer.classList.add("hidden");
    messagesDrawer.classList.add("hidden");

    navExploreBtn.classList.add("active");
    navRoomsBtn.classList.remove("active");
    navMessagesBtn.classList.remove("active");
});
navRoomsBtn.addEventListener("click", () => {
    roomsDrawer.classList.remove("hidden");
    exploreDrawer.classList.add("hidden");
    messagesDrawer.classList.add("hidden");

    navRoomsBtn.classList.add("active");
    navExploreBtn.classList.remove("active");
    navMessagesBtn.classList.remove("active");
});
navMessagesBtn.addEventListener("click", () => {
    messagesDrawer.classList.remove("hidden");
    roomsDrawer.classList.add("hidden");
    exploreDrawer.classList.add("hidden");

    navMessagesBtn.classList.add("active");
    navRoomsBtn.classList.remove("active");
    navExploreBtn.classList.remove("active");
});
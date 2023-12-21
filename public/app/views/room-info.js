import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";
import { getOrCreateWrapper, getWrapper, hasWrapper } from "./wrapper.js";
import { changeViewDrawer, switchDrawer } from "../ui.js";
import { leaveRoom } from "../main.js";

export function getOrCreateRoomInfoWrapper(room) {
    let roomKey = `#${room.name}`;
    let infoKey = `i#${room.name}`;
    if (hasWrapper(infoKey)) return getWrapper(infoKey);

    let wrapper = getOrCreateWrapper(infoKey);

    wrapper.header.classList.add("room-info");
    wrapper.content.classList.add("room-info");
    wrapper.footer.classList.add("room-info");

    // Add header elements
    let backIcon = domParser(
        `<div class="ic-small-container">
            <span class="ic-raw ic-small ic-chevron-left"></span>
        </div>`
    );
    backIcon.addEventListener("click", () => {
        switchDrawer("view");

        // Change view drawer to room
        let wrapper = getWrapper(roomKey);
        changeViewDrawer(wrapper);
    });
    wrapper.header.appendChild(backIcon);

    // Add leave room button
    let leaveRoomBtn = domParser(
        `<button>Leave</button>`
    );
    leaveRoomBtn.addEventListener("click", async () => {
        let success = await leaveRoom(room.name);

        if (success) {
            switchDrawer("rooms");
        } else {
            console.error("Failed to leave room"); // TODO: make fancier
        }
    });
    wrapper.content.appendChild(leaveRoomBtn);

    return wrapper;
}

export function updateMemberJoin(userId, roomName, timestamp) {

}

export function updateMemberLeave(userId, roomName, timestamp) {

}
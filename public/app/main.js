import { Client } from "../lib/client.js";
import * as binForage from "https://debutter.dev/x/js/binforage.js";
import { updateRoomTabs } from "./ui.js";

export const client = new Client();

await client.login(await binForage.get("username"), await binForage.get("publicKey"), await binForage.get("privateKey")).catch((err) => {
    console.error(err);

    location.href = "/login";
});

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.username}!`);

    client.rooms.join("wonk").catch(console.warn);

    updateRoomTabs();
});

client.on("ping", (pings) => {
    console.log("pings", pings);
});

client.on("roomMemberLeave", (userId, roomName, timestamp) => {
    console.log("oopise member left", userId, roomName, timestamp);
});

client.on("roomMemberJoin", (userId, roomName, timestamp) => {
    console.log("yippee member joined", userId, roomName, timestamp);
});

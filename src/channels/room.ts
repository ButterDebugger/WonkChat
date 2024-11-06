import express from "express";
import info from "./room/info.js";
import typing from "./room/typing.js";
import message from "./room/message.js";
import create from "./room/create.js";
import leave from "./room/leave.js";
import join from "./room/join.js";

export const router = express.Router();

router.post("/room/:roomname/join", join);
router.post("/room/:roomname/leave", leave);
router.post("/room/:roomname/create", create);
router.post("/room/:roomname/message", message);
router.get("/room/:roomname/info", info);
router.post("/room/:roomname/typing", typing);

export function isValidRoomName(roomname: string) {
	if (typeof roomname !== "string") return false;

	return /^[a-z0-9_]{3,16}$/g.test(roomname);
}

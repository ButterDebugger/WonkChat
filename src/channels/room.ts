import { Hono } from "hono";
import info from "./room/info.ts";
import message from "./room/message.ts";
import create from "./room/create.ts";
import leave from "./room/leave.ts";
import join from "./room/join.ts";

export const router = new Hono();

router.route("/", join);
router.route("/", leave);
router.route("/", create);
router.route("/", message);
router.route("/", info);
// TODO: add typing route

export function isValidRoomName(roomname: string) {
	if (typeof roomname !== "string") return false;

	return /^[a-z0-9_]{3,16}$/g.test(roomname);
}

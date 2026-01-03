import info from "./room/info.ts";
import message from "./room/message.ts";
import create from "./room/create.ts";
import leave from "./room/leave.ts";
import join from "./room/join.ts";
import type { SessionEnv } from "../auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import createInvite from "./room/createInvite.ts";
import useInvite from "./room/useInvite.ts";

export const router = new OpenAPIHono<SessionEnv>();

router.route("/", join);
router.route("/", leave);
router.route("/", create);
router.route("/", message);
router.route("/", info);
router.route("/", createInvite);
router.route("/", useInvite);
// TODO: add typing route

export function isValidRoomName(roomname: string) {
	if (typeof roomname !== "string") return false;

	return /^[a-z0-9_]{3,16}$/g.test(roomname);
}

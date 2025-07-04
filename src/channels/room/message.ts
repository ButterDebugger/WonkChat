import { getWaterfall } from "../../sockets.ts";
import { authMiddleware, type SessionEnv } from "../../auth/session.ts";
import { getUserProfile, getRoom } from "../../lib/data.ts";
import * as openpgp from "openpgp";
import { isMessage, type Message } from "../../types.ts";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	ErrorSchema,
	HttpSessionHeadersSchema,
	RoomNameSchema
} from "../../lib/validation.ts";

const router = new OpenAPIHono<SessionEnv>();

router.openapi(
	createRoute({
		method: "post",
		path: "/:roomname/message",
		middleware: [authMiddleware] as const,
		request: {
			headers: HttpSessionHeadersSchema,
			params: z.object({
				roomname: RoomNameSchema
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string()
						})
					}
				}
			}
		},
		responses: {
			200: {
				description: "Success message"
			},
			400: {
				content: {
					"application/json": {
						schema: ErrorSchema
					}
				},
				description: "Returns an error"
			}
		}
	}),
	async (ctx) => {
		const tokenPayload = ctx.var.session;
		const { roomname } = ctx.req.valid("param");

		const userSession = await getUserProfile(tokenPayload.username);
		if (userSession === null)
			return ctx.json(
				{
					success: false,
					message: "User session does not exist",
					code: 507
				},
				400
			);

		if (!userSession)
			return ctx.json(
				{
					success: false,
					message: "User does not exist",
					code: 401
				},
				400
			);

		if (!userSession.rooms.has(roomname))
			return ctx.json(
				{
					success: false,
					message:
						"Cannot send a message in a room that you are not in",
					code: 304
				},
				400
			);

		const room = await getRoom(roomname);

		if (room === null)
			return ctx.json(
				{
					success: false,
					message: "Room doesn't exist",
					code: 303
				},
				400
			);

		const { message } = ctx.req.valid("json");

		let decrypted: Message;
		try {
			const { data } = await openpgp.decrypt({
				message: await openpgp.readMessage({ armoredMessage: message }),
				decryptionKeys: await openpgp.readPrivateKey({
					binaryKey: room.privateKey
				})
			});

			if (typeof data !== "string" || !data.startsWith("{"))
				return ctx.json(
					{
						success: false,
						message: "Invalid body",
						code: 101
					},
					400
				);

			decrypted = JSON.parse(data);
		} catch (_err) {
			return ctx.json(
				{
					success: false,
					message: "Invalid encrypted body",
					code: 104
				},
				400
			);
		}

		if (!isMessage(decrypted))
			return ctx.json(
				{
					success: false,
					message: "Invalid encrypted body",
					code: 104
				},
				400
			);

		const { content, attachments } = decrypted;

		if (content.length > 1000 || content.replace(/\s/g, "").length === 0)
			return ctx.json(
				{
					success: false,
					message: "Invalid message content",
					code: 201
				},
				400
			);

		for (const username of room.members) {
			const waterfall = getWaterfall(username);
			if (waterfall === null) continue;

			waterfall.send({
				event: "message",
				author: {
					username: userSession.username,
					color: userSession.color,
					offline: !userSession.online // TODO: Change this to a online field
				},
				room: roomname,
				content: content,
				attachments: attachments,
				timestamp: Date.now()
			});
		}

		return ctx.json(
			{
				success: true
			},
			200
		);
	}
);

export default router;

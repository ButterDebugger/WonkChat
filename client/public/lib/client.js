import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.2/+esm";
import eventemitter3 from "https://cdn.jsdelivr.net/npm/eventemitter3@5.0.1/+esm";
import EventSource from "https://cdn.jsdelivr.net/npm/eventsource@2.0.2/+esm";
import { decryptMessage, generateKeyPair } from "./cryption.js";
import RoomManager, { Room } from "./roomManager.js";
import UserManager, { ClientUser, User } from "./userManager.js";
import { ClientError } from "./builtinErrors.js";
import AttachmentManager from "./attachmentManager.js";

export { generateKeyPair };

export class Client extends eventemitter3 {
	static baseUrl = "https://chat.debutter.dev";

	constructor() {
		super();

		this.stream = null;
		this.token = null;
		this.user = null;
		this.keyPair = {
			publicKey: null,
			privateKey: null
		};
		this.rooms = new RoomManager(this);
		this.users = new UserManager(this);
		this.attachments = new AttachmentManager(this);

		this.request = axios.create({
			baseURL: Client.baseUrl,
			headers: {}
		});
	}

	async syncClient() {
		return new Promise((resolve) => {
			this.request
				.get(`/api/sync/client`)
				.then(async (res) => {
					let { rooms, users, you } = res.data;

					// Update the rooms cache
					for (let room of rooms) {
						if (this.rooms.cache.has(room.name)) {
							let cachedRoom = this.rooms.cache.get(room.name);

							cachedRoom.description = room.description;
							cachedRoom.key = room.key;
							cachedRoom.members = new Set(room.members);
						} else {
							this.rooms.cache.set(room.name, new Room(this, room.name, room.description, room.key, room.members));
						}
					}

					// Update the users cache
					for (let user of users) {
						if (this.users.cache.has(user.id)) {
							let cachedUser = this.users.cache.get(user.id);

							cachedUser.username = user.username;
							cachedUser.color = user.color;
							cachedUser.offline = user.offline;
						} else {
							this.users.cache.set(user.id, new User(this, user.id, user.username, user.color, user.offline));
						}
					}

					// Update the client users cache
					this.user.username = you.username;
					this.user.color = you.color;
					this.user.offline = you.offline;

					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}

	async syncMemory() {
		return new Promise((resolve) => {
			this.request
				.get(`/api/sync/memory`)
				.then(async () => {
					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}

	async authorize(username, publicKey, privateKey) {
		// Make login request
		let loginRes;

		try {
			loginRes = await this.request.post(`/auth/login`, {
				username: username,
				publicKey: publicKey
			});
		} catch (err) {
			throw typeof err?.response == "object" ? new ClientError(err.response.data, err) : err;
		}

		let loginData = loginRes.data;
		let message = loginData.message;
		let loginId = loginData.id;
		let decrypted = await decryptMessage(message, privateKey);

		// Make verify login request
		let verifyRes;

		try {
			verifyRes = await this.request.post(`/auth/verify/${loginId}`, {
				message: decrypted
			})
		} catch (err) {
			throw typeof err?.response == "object" ? new ClientError(err.response.data, err) : err;
		}

		let verifyData = verifyRes.data;

		// Save client variables
		this.keyPair.publicKey = publicKey;
		this.keyPair.privateKey = privateKey;
		this.user = new ClientUser(this, verifyData.id, username);
		this.users.cache.set(verifyData.id, this.user);
		this.token = verifyData.token;

		// Add authorization to the client request instance
		this.request = axios.create({
			baseURL: Client.baseUrl,
			headers: {
				Authorization: this.token
			}
		});

		return true;
	}

	async login(username, publicKey, privateKey) {
		await this.authorize(username, publicKey, privateKey);

		await this.syncClient();

		// Connect to event stream
		this.stream = new EventSource(`${Client.baseUrl}/api/stream`, {
			headers: {
				Authorization: this.token
			}
		});

		// Add stream event listeners
		this.stream.once("connect", () => {
			this.emit("ready");
			
			this.syncMemory();
		});
		this.stream.on("ping", async ({ data }) => {
			data = await parseStreamData(data, this.keyPair.privateKey);

			this.emit("ping", data.ping);
		});
		this.stream.on("updateMember", async ({ data }) => {
			data = await parseStreamData(data, this.keyPair.privateKey);
			
			switch (data.state) {
				case "join":
					this.emit("roomMemberJoin", data.id, data.room, data.timestamp);
					break;
				case "leave":
					this.emit("roomMemberLeave", data.id, data.room, data.timestamp);
					break;
				default:
					// TODO: Throw out of date client error
					break;
			}
		});
		this.stream.on("updateUser", async ({ data }) => {
			data = await parseStreamData(data, this.keyPair.privateKey);

			this.emit("userUpdate", data.id, data.data, data.timestamp);
		});
		this.stream.on("message", async ({ data }) => {
			data = await parseStreamData(data, this.keyPair.privateKey);

			let authorData = {
				...data.author,
				timestamp: data.timestamp
			};
			this.users.update(data.author.id, authorData);
			let message = new RoomMessage(this, data.author.id, data.room, data);

			this.emit("roomMemberMessage", message);
		});
	}
}

async function parseStreamData(data, privateKey) {
	try {
		data = JSON.parse(data);
		data = await cryption.decrypt(data, privateKey);
		data = JSON.parse(data);
	} catch (error) {};

	return data;
}

class RoomMessage {
	constructor(client, userId, roomName, msgData) {
		Object.defineProperty(this, "client", { value: client });

		this._userId = userId;
		this._roomName = roomName;

		this.content = msgData.content;
		this.attachments = msgData.attachments;
		this.timestamp = msgData.timestamp;
	}

	get room() {
		return this.client.rooms.cache.get(this._roomName);
	}
	get author() {
		return this.client.users.cache.get(this._userId);
	}
}

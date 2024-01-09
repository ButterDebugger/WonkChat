import { ClientError } from "./builtinErrors.js";
import { encryptMessage } from "./cryption.js";

export default class RoomManager {
	constructor(client) {
		Object.defineProperty(this, "client", { value: client });

		this.cache = new Map();
		
		client.on("roomMemberJoin", (userId, roomName) => {
			if (!this.cache.has(roomName)) return;

			this.cache.get(roomName).members.add(userId);
		});
		client.on("roomMemberLeave", (userId, roomName) => {
			if (!this.cache.has(roomName)) return;

			this.cache.get(roomName).members.delete(userId);
		});
	}

	join(roomName) {
		return new Promise((resolve, reject) => {
			this.client.request
				.post(`/api/rooms/${roomName}/join`)
				.then(async (res) => {
					const { name, description, key, members } = res.data;

					let room = new Room(this.client, name, description, key, members);
					this.cache.set(name, room);

					resolve(room);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
	leave(roomName) {
		return new Promise((resolve, reject) => {
			this.client.request
				.post(`/api/rooms/${roomName}/leave`)
				.then((res) => {
					if (!res.data.success) return resolve(false);

					this.cache.delete(roomName);
					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
	create(roomName) {
		return new Promise((resolve, reject) => {
			this.client.request
				.post(`/api/rooms/${roomName}/create`)
				.then((res) => {
					resolve(res.data);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
}

export class Room {
	constructor(client, name, description, key, members) {
		Object.defineProperty(this, "client", { value: client });

		this.name = name;
		this.description = description;
		this.publicKey = key;
		this.members = new Set(members);
	}

	send(options) {
		if (typeof options == "string") {
			options = { text: options };
		}

		let attachments = (options.attachments ?? []).filter(attach => attach.uploaded).map(attach => attach.path);

		return new Promise(async (resolve, reject) => {
			this.client.request
				.post(`/api/rooms/${this.name}/message`, {
					message: await encryptMessage(JSON.stringify({
						content: options.text,
						attachments: attachments
					}), this.publicKey)
				})
				.then((res) => {
					resolve(res.data);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}

	refresh() {
		return new Promise((resolve, reject) => {
			this.client.request
				.get(`/api/rooms/${this.name}/info`)
				.then((res) => {
					if (!res.data.success) return resolve(false);

					this.description = res.data.description;
					this.publicKey = res.data.key;
					this.members = new Set(res.data.members);
					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
}

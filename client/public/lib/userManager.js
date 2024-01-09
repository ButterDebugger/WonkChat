import { ClientError } from "./builtinErrors.js";

export default class UserManager {
	constructor(client) {
		Object.defineProperty(this, "client", { value: client });

		this.cache = new Map();

		this.client.on("userUpdate", (id, data) => this.update(id, data));
	}

	update(userId, data) {
		if (this.cache.has(userId)) {
			let cachedUser = this.cache.get(userId);

			if (cachedUser.cacheTime >= data.timestamp) return; // Don't cache

			cachedUser.color = data.color;
			cachedUser.offline = data.offline;
			cachedUser.username = data.username;
		} else {
			this.users.cache.set(id, new User(this.client, data.id, data.username, data.color, data.offline, data.timestamp));
		}
	}

	subscribe(userId) {
		return new Promise((resolve) => {
			this.client.request
				.post(`/api/users/${userId}/subscribe`)
				.then(async () => {
					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
	unsubscribe(userId) {
		return new Promise((resolve) => {
			this.client.request
				.post(`/api/users/${userId}/unsubscribe`)
				.then(async () => {
					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
	fetch(userId) {
		return new Promise((resolve) => {
			this.client.request
				.get(`/api/users/${userId}/fetch`)
				.then(async (res) => {
					let { id, data } = res.data;

					this.update(id, data);
					
					resolve(this.cache.get(id));
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
}

export class User {
	constructor(client, id, username, color, offline, timestamp = Date.now()) {
		Object.defineProperty(this, "client", { value: client });

		this.id = id;
		this.username = username;
		this.color = color;
		this.offline = offline;
		this.cacheTime = timestamp;
	}

	get online() {
		return !this.offline;
	}
	set online(value) {
		this.offline = !value;
	}
}

export class ClientUser extends User { // TODO: why do we need this
	constructor(client, id, username) {
		super(client, id, username);

		client.users.cache.set(id, this);
	}
}

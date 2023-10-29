export default class AttachmentManager {
	constructor(client) {
		Object.defineProperty(this, "client", { value: client });
	}

	create(content) {
		return new Attachment(this.client, content);
	}

	upload(attachments, progress) {
		return new Promise(async (resolve, reject) => {
			let formData = new FormData();
			for (let attachment of attachments) {
				formData.append("files", attachment.file);
			}

			this.client.request
				.post(`/upload`, formData, {
					headers: {
                        "Content-Type": "multipart/form-data",
                        "Accept": "application/json"
					},
					onUploadProgress: progress
				})
				.then((res) => {
                    for (let result of res.data) {
						let attachment = attachments.find( // TODO: implement a better way of matching attachments
							(attach) =>
								attach.file.name === result.filename &&
								attach.file.size === result.size
						);

                        if (attachment.uploaded) continue;
                        if (result.success) attachment.path = result.path;
                    }

					resolve(true);
				})
				.catch((err) => reject(typeof err?.response == "object" ? new ClientError(err.response.data, err) : err));
		});
	}
}

export class Attachment {
	constructor(client, content) {
		Object.defineProperty(this, "client", { value: client });

		if (!(content instanceof File))
			throw new TypeError("Attachment must be a file.");

		this.file = content;
        this.path = null;
	}

    get uploaded() {
        return !(this.path === null);
    }

	async upload(progress) {
		return this.client.attachments.upload([this], progress);
	}
}

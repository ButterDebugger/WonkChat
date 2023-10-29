import * as openpgp from "https://cdn.jsdelivr.net/npm/openpgp@5.10.2/+esm";

export async function decryptMessage(message, privateKey) {
	let { data: decrypted } = await openpgp.decrypt({
		message: await openpgp.readMessage({ armoredMessage: message }),
		decryptionKeys: await openpgp.readKey({ armoredKey: privateKey }),
	});

	return decrypted;
}

export async function encryptMessage(message, publicKey) {
	return await openpgp.encrypt({
		message: await openpgp.createMessage({ text: message }),
		encryptionKeys: await openpgp.readKey({ armoredKey: publicKey }),
	});
}

export async function generateKeyPair(name, bits = 2048) {
	let { publicKey, privateKey } = await openpgp.generateKey({
		type: "rsa",
		rsaBits: bits,
		userIDs: [{
            name: name
		}]
	});

	return {
		publicKey: publicKey,
		privateKey: privateKey
	};
}

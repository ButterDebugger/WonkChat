import crypto, { BinaryLike } from "node:crypto";

const epoch = 1640995200000n; // First second of 2023
let sequence = 0n;

export const Snowflake = {
	generate: function () {
		let timestamp = BigInt(Date.now()) - epoch;
		let processId = BigInt(process.pid);

		// Constrain to a fixed length
		timestamp &= 0b111111111111111111111111111111111111111111n;
		processId &= 0b1111111111n;

		// Left shift the bits into alignment
		timestamp <<= 22n;
		processId <<= 12n;

		// Merge all the values together
		let id = timestamp | processId | sequence;

		// Increment the sequence
		sequence = (sequence + 1n) & 0b111111111111n;

		return intToBase36(id);
	},
	getTimestamp: function (id: string): number {
		let int = base36ToInt(id);
		let bigTimestamp = (int >> 22n) + epoch;
		return Number(bigTimestamp);
	}
};
export const Fingerprint = {
	generate: function (key: BinaryLike) {
		let hash = crypto.createHash("sha256").update(key).digest("hex");
		let int = BigInt(`0x${hash}`);
		return intToBase36(int);
	}
};

export function intToBase36(number: bigint): string {
	const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
	let result = number > 0n ? "" : "0";
	while (number > 0n) {
		let index: number = Number(number % 36n);
		result = baseChars[index] + result;
		number = number / 36n;
	}
	return result;
}

export function base36ToInt(string: string): bigint {
	const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
	let length = BigInt(string.length) - 1n;
	let result = 0n;
	for (let char of string) {
		result += BigInt(baseChars.indexOf(char)) * 36n ** length;
		length--;
	}
	return result;
}

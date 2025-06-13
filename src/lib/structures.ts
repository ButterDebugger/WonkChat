import crypto, { type BinaryLike } from "node:crypto";
import process from "node:process";

const epoch = 1640995200000n; // First second of 2023
let sequence = 0n;

export const Snowflake = {
	generate: () => {
		let timestamp = BigInt(Date.now()) - epoch;
		let processId = BigInt(process.pid);

		// Constrain to a fixed length
		timestamp &= 0b111111111111111111111111111111111111111111n;
		processId &= 0b1111111111n;

		// Left shift the bits into alignment
		timestamp <<= 22n;
		processId <<= 12n;

		// Merge all the values together
		const id = timestamp | processId | sequence;

		// Increment the sequence
		sequence = (sequence + 1n) & 0b111111111111n;

		return intToBase36(id);
	},
	getTimestamp: (id: string): number => {
		const int = base36ToInt(id);
		const bigTimestamp = (int >> 22n) + epoch;
		return Number(bigTimestamp);
	}
};
export const Fingerprint = {
	generate: (key: BinaryLike) => {
		const hash = crypto.createHash("sha256").update(key).digest("hex");
		const int = BigInt(`0x${hash}`);
		return intToBase36(int);
	}
};
export const Color = {
	intToHex: (int: number) => {
		const [r, g, b] = Color.intToRGB(int);

		const rHex = r.toString(16).padStart(2, "0");
		const gHex = g.toString(16).padStart(2, "0");
		const bHex = b.toString(16).padStart(2, "0");

		return `#${rHex}${gHex}${bHex}`;
	},
	intToRGB: (int: number): [number, number, number] => {
		const r = (int >> 16) & 0xff;
		const g = (int >> 8) & 0xff;
		const b = int & 0xff;

		return [r, g, b];
	},
	hexToInt: (hex: string): number => {
		if (!hex.startsWith("#")) throw new Error("Invalid hex color");
		if (hex.length !== 7) throw new Error("Invalid hex color");

		return parseInt(hex.slice(1), 16);
	},
	RGBToInt: (r: number, g: number, b: number): number => {
		return (r << 16) | (g << 8) | b;
	}
};

export function intToBase36(number: bigint): string {
	const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
	let bigint = number;
	let result = bigint > 0n ? "" : "0";
	while (bigint > 0n) {
		const index: number = Number(bigint % 36n);
		result = baseChars[index] + result;
		bigint = bigint / 36n;
	}
	return result;
}

export function base36ToInt(string: string): bigint {
	const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
	let length = BigInt(string.length) - 1n;
	let result = 0n;
	for (const char of string) {
		result += BigInt(baseChars.indexOf(char)) * 36n ** length;
		length--;
	}
	return result;
}

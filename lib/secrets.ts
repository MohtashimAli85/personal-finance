import "server-only";
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

export class SecretError extends Error {}

export function hasSecretKey(): boolean {
	try {
		getKey();
		return true;
	} catch {
		return false;
	}
}

function getKey(): Buffer {
	const secret = process.env.APP_SECRET_KEY;
	if (!secret) {
		throw new SecretError(
			"APP_SECRET_KEY is not set. Refusing to store secrets unencrypted.",
		);
	}
	const key = Buffer.from(secret, "hex");
	if (key.length !== 32) {
		throw new SecretError(
			"APP_SECRET_KEY must be a 32-byte hex string (run: openssl rand -hex 32).",
		);
	}
	return key;
}

export function encryptSecret(plaintext: string): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encrypted: string): string {
	const buffer = Buffer.from(encrypted, "base64");
	if (buffer.length < 28) {
		throw new SecretError("Encrypted secret is malformed.");
	}
	const iv = buffer.subarray(0, 12);
	const tag = buffer.subarray(12, 28);
	const data = buffer.subarray(28);
	const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(data), decipher.final()]).toString(
		"utf8",
	);
}

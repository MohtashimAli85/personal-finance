import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

export class MailSecretError extends Error {}

export function hasMailSecret(): boolean {
	return Boolean(process.env.ENCRYPTION_KEY);
}

function getKey(): Buffer {
	const secret = process.env.ENCRYPTION_KEY;
	if (!secret) {
		throw new MailSecretError(
			"No ENCRYPTION_KEY environment variable is set. Refusing to store credentials.",
		);
	}

	const key = Buffer.from(secret, "hex");
	if (key.length !== 32) {
		throw new MailSecretError(
			"ENCRYPTION_KEY must be a 32-byte hex string (run: openssl rand -hex 32).",
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
		throw new MailSecretError("Encrypted credentials are malformed.");
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

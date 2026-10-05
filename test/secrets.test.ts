import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
	decryptSecret,
	encryptSecret,
	hasSecretKey,
	SecretError,
} from "@/lib/secrets";

const original = process.env.APP_SECRET_KEY;
const newKey = () => crypto.randomBytes(32).toString("hex");

afterEach(() => {
	process.env.APP_SECRET_KEY = original;
});

describe("secrets", () => {
	it("round-trips a value", () => {
		process.env.APP_SECRET_KEY = newKey();
		const encrypted = encryptSecret("gsk_test_value");
		expect(encrypted).not.toContain("gsk_test_value");
		expect(decryptSecret(encrypted)).toBe("gsk_test_value");
	});

	it("uses a fresh IV per encryption", () => {
		process.env.APP_SECRET_KEY = newKey();
		expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
	});

	it("fails to decrypt with a different key", () => {
		process.env.APP_SECRET_KEY = newKey();
		const encrypted = encryptSecret("value");
		process.env.APP_SECRET_KEY = newKey();
		expect(() => decryptSecret(encrypted)).toThrow();
	});

	it("rejects tampered ciphertext", () => {
		process.env.APP_SECRET_KEY = newKey();
		const buffer = Buffer.from(encryptSecret("value"), "base64");
		buffer[buffer.length - 1] ^= 0xff;
		expect(() => decryptSecret(buffer.toString("base64"))).toThrow();
	});

	it("refuses to work without a valid key", () => {
		delete process.env.APP_SECRET_KEY;
		expect(hasSecretKey()).toBe(false);
		expect(() => encryptSecret("value")).toThrow(SecretError);

		process.env.APP_SECRET_KEY = "abcd";
		expect(hasSecretKey()).toBe(false);
		expect(() => encryptSecret("value")).toThrow(SecretError);
	});
});

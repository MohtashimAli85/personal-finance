import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let settings: typeof import("@/lib/settings");

const newKey = () => crypto.randomBytes(32).toString("hex");

beforeAll(async () => {
	ctx = await createTestDb();
	settings = await import("@/lib/settings");
});

afterAll(() => ctx.cleanup());

beforeEach(() => {
	process.env.APP_SECRET_KEY = newKey();
	delete process.env.GROQ_API_KEY;
	delete process.env.GEMINI_API_KEY;
	ctx.db.delete(ctx.schema.app_settings).run();
});

describe("AI key settings", () => {
	it("stores keys encrypted and reads them back", () => {
		settings.storeApiKey("groq", "gsk_secret_value_123456");

		const row = ctx.db.select().from(ctx.schema.app_settings).get();
		expect(row?.value).toBeDefined();
		expect(row?.value).not.toContain("gsk_secret_value_123456");

		expect(settings.getApiKey("groq")).toBe("gsk_secret_value_123456");
		expect(settings.getAiKeyStatus().providers).toEqual({
			groq: "stored",
			gemini: "none",
		});
	});

	it("replaces an existing key", () => {
		settings.storeApiKey("groq", "gsk_first_value_1234567");
		settings.storeApiKey("groq", "gsk_second_value_123456");
		expect(settings.getApiKey("groq")).toBe("gsk_second_value_123456");
		expect(ctx.db.select().from(ctx.schema.app_settings).all()).toHaveLength(1);
	});

	it("prefers the environment over the stored key", () => {
		settings.storeApiKey("gemini", "AIza_stored_value_12345");
		process.env.GEMINI_API_KEY = "AIza_env_value_123456789";
		expect(settings.getApiKey("gemini")).toBe("AIza_env_value_123456789");
		expect(settings.getAiKeyStatus().providers.gemini).toBe("env");
	});

	it("reports a key encrypted under a lost secret as unreadable", () => {
		settings.storeApiKey("groq", "gsk_secret_value_123456");
		process.env.APP_SECRET_KEY = newKey();
		expect(settings.getApiKey("groq")).toBeNull();
		expect(settings.getAiKeyStatus().providers.groq).toBe("unreadable");
	});

	it("never exposes key material in the status", () => {
		settings.storeApiKey("groq", "gsk_secret_value_123456");
		expect(JSON.stringify(settings.getAiKeyStatus())).not.toContain("gsk_");
	});

	it("removes a stored key", () => {
		settings.storeApiKey("groq", "gsk_secret_value_123456");
		settings.removeApiKey("groq");
		expect(settings.getApiKey("groq")).toBeNull();
	});

	it("reports canStore based on the secret key", () => {
		expect(settings.getAiKeyStatus().canStore).toBe(true);
		delete process.env.APP_SECRET_KEY;
		expect(settings.getAiKeyStatus().canStore).toBe(false);
	});
});

describe("profile", () => {
	it("stores, reads back and clears profile fields", () => {
		expect(settings.getProfile()).toEqual({ name: "", about: "", style: "" });
		settings.storeProfile({
			name: "Mo",
			about: "Paid on the 1st, saving for a car.",
			style: "",
		});
		expect(settings.getProfile()).toEqual({
			name: "Mo",
			about: "Paid on the 1st, saving for a car.",
			style: "",
		});
		settings.storeProfile({ name: "", about: "Updated", style: "Be blunt" });
		expect(settings.getProfile()).toEqual({
			name: "",
			about: "Updated",
			style: "Be blunt",
		});
		const keys = ctx.db
			.select()
			.from(ctx.schema.app_settings)
			.all()
			.map((row) => row.key)
			.sort();
		expect(keys).toEqual(["profile_about", "profile_style"]);
	});
});

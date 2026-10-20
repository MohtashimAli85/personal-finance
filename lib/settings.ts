import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { app_settings } from "@/lib/db/schema";
import type { Profile } from "@/lib/profile-schema";
import { decryptSecret, encryptSecret, hasSecretKey } from "@/lib/secrets";

export const AI_PROVIDERS = ["groq", "gemini", "anthropic", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export type ApiKeySource = "env" | "stored" | "unreadable" | "none";

const ENV_KEYS: Record<AiProvider, string> = {
	groq: "GROQ_API_KEY",
	gemini: "GEMINI_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	openai: "OPENAI_API_KEY",
};

const settingKey = (provider: AiProvider) => `${provider}_api_key`;

export const isAiProvider = (value: unknown): value is AiProvider =>
	AI_PROVIDERS.includes(value as AiProvider);

export const getSetting = (key: string) =>
	db
		.select({ value: app_settings.value })
		.from(app_settings)
		.where(eq(app_settings.key, key))
		.get()?.value ?? null;

export function setSetting(key: string, value: string) {
	db.insert(app_settings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: app_settings.key,
			set: { value, updated_at: sql`(datetime('now'))` },
		})
		.run();
}

const readStored = (provider: AiProvider) => getSetting(settingKey(provider));

function resolveApiKey(provider: AiProvider): {
	source: ApiKeySource;
	key: string | null;
} {
	const fromEnv = process.env[ENV_KEYS[provider]]?.trim();
	if (fromEnv) return { source: "env", key: fromEnv };

	const stored = readStored(provider);
	if (!stored) return { source: "none", key: null };
	try {
		return { source: "stored", key: decryptSecret(stored) };
	} catch {
		return { source: "unreadable", key: null };
	}
}

export const getApiKey = (provider: AiProvider) => resolveApiKey(provider).key;

export const configuredProviders = (): AiProvider[] =>
	AI_PROVIDERS.filter((provider) => getApiKey(provider));

export interface AiKeyStatus {
	canStore: boolean;
	providers: Record<AiProvider, ApiKeySource>;
}

export function getAiKeyStatus(): AiKeyStatus {
	return {
		canStore: hasSecretKey(),
		providers: Object.fromEntries(
			AI_PROVIDERS.map((provider) => [
				provider,
				resolveApiKey(provider).source,
			]),
		) as Record<AiProvider, ApiKeySource>,
	};
}

export function storeApiKey(provider: AiProvider, apiKey: string) {
	setSetting(settingKey(provider), encryptSecret(apiKey));
}

export function removeApiKey(provider: AiProvider) {
	db.delete(app_settings)
		.where(eq(app_settings.key, settingKey(provider)))
		.run();
}

const PROFILE_KEYS: Record<keyof Profile, string> = {
	name: "profile_name",
	about: "profile_about",
	style: "profile_style",
};

export function getProfile(): Profile {
	const rows = db
		.select({ key: app_settings.key, value: app_settings.value })
		.from(app_settings)
		.where(inArray(app_settings.key, Object.values(PROFILE_KEYS)))
		.all();
	const values = new Map(rows.map((row) => [row.key, row.value]));
	return {
		name: values.get(PROFILE_KEYS.name) ?? "",
		about: values.get(PROFILE_KEYS.about) ?? "",
		style: values.get(PROFILE_KEYS.style) ?? "",
	};
}

export function storeProfile(profile: Profile) {
	db.transaction(() => {
		for (const field of Object.keys(PROFILE_KEYS) as (keyof Profile)[]) {
			const key = PROFILE_KEYS[field];
			const value = profile[field].trim();
			if (!value) {
				db.delete(app_settings).where(eq(app_settings.key, key)).run();
				continue;
			}
			setSetting(key, value);
		}
	});
}

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { type AiProvider, getApiKey } from "@/lib/settings";

export interface ModelEntry {
	provider: AiProvider;
	model: string;
}

export const MODEL_CHAIN: ModelEntry[] = [
	{ provider: "groq", model: "openai/gpt-oss-120b" },
	{ provider: "groq", model: "openai/gpt-oss-20b" },
	{ provider: "gemini", model: "gemini-3.5-flash" },
	{ provider: "gemini", model: "gemini-3.5-flash-lite" },
	{ provider: "anthropic", model: "claude-haiku-5-5" },
	{ provider: "openai", model: "gpt-5.4-nano" },
];

export interface ResolvedModel extends ModelEntry {
	languageModel: LanguageModelV4;
}

function createModel(entry: ModelEntry, apiKey: string): LanguageModelV4 {
	switch (entry.provider) {
		case "groq":
			return createGroq({ apiKey })(entry.model);
		case "gemini":
			return createGoogle({ apiKey })(entry.model);
		case "anthropic":
			return createAnthropic({ apiKey })(entry.model);
		case "openai":
			return createOpenAI({ apiKey })(entry.model);
	}
}

export function availableModels(
	chain: ModelEntry[] = MODEL_CHAIN,
	preferred?: string,
): ResolvedModel[] {
	const keys = new Map<AiProvider, string | null>();
	const resolved: ResolvedModel[] = [];
	for (const entry of chain) {
		if (!keys.has(entry.provider)) {
			keys.set(entry.provider, getApiKey(entry.provider));
		}
		const apiKey = keys.get(entry.provider);
		if (apiKey) {
			resolved.push({ ...entry, languageModel: createModel(entry, apiKey) });
		}
	}
	const index = resolved.findIndex((entry) => entry.model === preferred);
	if (index > 0) resolved.unshift(...resolved.splice(index, 1));
	return resolved;
}

export function availableModelEntries(): ModelEntry[] {
	return availableModels().map(({ provider, model }) => ({ provider, model }));
}

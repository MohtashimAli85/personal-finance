import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
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
];

export interface ResolvedModel extends ModelEntry {
	languageModel: LanguageModel;
}

function createModel(entry: ModelEntry, apiKey: string): LanguageModel {
	if (entry.provider === "groq") {
		return createGroq({ apiKey })(entry.model);
	}
	return createGoogle({ apiKey })(entry.model);
}

export function availableModels(
	chain: ModelEntry[] = MODEL_CHAIN,
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
	return resolved;
}

import type { AiProvider } from "@/lib/settings";

// Order matters: Anthropic keys also start with "sk-".
const KEY_PREFIXES: [string, AiProvider][] = [
	["sk-ant-", "anthropic"],
	["sk-", "openai"],
	["gsk_", "groq"],
	["AIza", "gemini"],
];

export function detectProvider(apiKey: string): AiProvider | null {
	const key = apiKey.trim();
	return KEY_PREFIXES.find(([prefix]) => key.startsWith(prefix))?.[1] ?? null;
}

import type { AiProvider, ApiKeySource } from "@/lib/settings";

export interface ProviderInfo {
	id: AiProvider;
	name: string;
	description: string;
	keyUrl: string;
}

export const PROVIDERS: ProviderInfo[] = [
	{
		id: "groq",
		name: "Groq",
		description: "Primary model: GPT-OSS 120B, falling back to GPT-OSS 20B.",
		keyUrl: "https://console.groq.com/keys",
	},
	{
		id: "gemini",
		name: "Google Gemini",
		description: "Fallback when Groq is unavailable or rate limited.",
		keyUrl: "https://aistudio.google.com/apikey",
	},
	{
		id: "anthropic",
		name: "Anthropic Claude",
		description: "Claude Haiku, used when the providers above fail.",
		keyUrl: "https://console.anthropic.com/settings/keys",
	},
	{
		id: "openai",
		name: "OpenAI",
		description: "GPT-5.4 Nano, the last fallback.",
		keyUrl: "https://platform.openai.com/api-keys",
	},
];

export const SOURCE_BADGE: Record<
	ApiKeySource,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	env: { label: "Set via environment", variant: "secondary" },
	stored: { label: "Saved (encrypted)", variant: "default" },
	unreadable: { label: "Can't decrypt - re-enter", variant: "destructive" },
	none: { label: "Not set", variant: "outline" },
};

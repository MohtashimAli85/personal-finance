import type { AiProvider } from "@/lib/settings";

export const AUTO_MODEL = "auto";

export const PROVIDER_LABELS: Record<AiProvider, string> = {
	groq: "Groq",
	gemini: "Gemini",
	anthropic: "Claude",
	openai: "OpenAI",
};

export function modelLabel(model: string): string {
	const gptOss = model.match(/gpt-oss-(\d+)b/i);
	if (gptOss) return `GPT-OSS ${gptOss[1]}B (Groq)`;
	const gemini = model.match(/^gemini-([\d.]+)-(flash-lite|flash|pro)/i);
	if (gemini) {
		const tier = gemini[2]
			.split("-")
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join(" ");
		return `Gemini ${gemini[1]} ${tier}`;
	}
	const claude = model.match(/^claude-(opus|sonnet|haiku)-(\d+)-(\d+)$/i);
	if (claude) {
		const tier = claude[1][0].toUpperCase() + claude[1].slice(1);
		return `Claude ${tier} ${claude[2]}.${claude[3]}`;
	}
	const openai = model.match(/^gpt-([\d.]+)-(nano|mini)$/i);
	if (openai) {
		const tier = openai[2][0].toUpperCase() + openai[2].slice(1);
		return `GPT-${openai[1]} ${tier} (OpenAI)`;
	}
	return model;
}

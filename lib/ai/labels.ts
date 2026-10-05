import type { AiProvider } from "@/lib/settings";

export const PROVIDER_LABELS: Record<AiProvider, string> = {
	groq: "Groq",
	gemini: "Gemini",
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
	return model;
}

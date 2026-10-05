"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { describeAiError } from "@/lib/ai/errors";
import { availableModels, MODEL_CHAIN, modelLabel } from "@/lib/ai/models";
import { hasSecretKey } from "@/lib/secrets";
import { isAiProvider, removeApiKey, storeApiKey } from "@/lib/settings";

const revalidateSettings = () => {
	revalidatePath("/settings");
	revalidatePath("/chat");
};

export async function saveApiKey(
	_prev: ActionState,
	payload: { provider: string; apiKey: string },
): Promise<ActionState> {
	const { provider } = payload;
	const apiKey = payload.apiKey.trim();
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	if (!hasSecretKey()) {
		return {
			success: false,
			message:
				"No encryption key is configured, so API keys can't be stored securely. Set APP_SECRET_KEY (see README).",
		};
	}
	if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) {
		return {
			success: false,
			errors: { apiKey: { message: "That doesn't look like an API key." } },
		};
	}

	storeApiKey(provider, apiKey);
	revalidateSettings();
	return { success: true, message: "API key saved." };
}

export async function clearApiKey(provider: string): Promise<ActionState> {
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	removeApiKey(provider);
	revalidateSettings();
	return { success: true, message: "API key removed." };
}

export async function testAiConnection(provider: string): Promise<ActionState> {
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	const [model] = availableModels(
		MODEL_CHAIN.filter((entry) => entry.provider === provider),
	);
	if (!model) {
		return { success: false, message: "No usable API key for this provider." };
	}

	try {
		await generateText({
			model: model.languageModel,
			prompt: "Reply with the single word OK.",
			reasoning: "low",
			maxRetries: 0,
			abortSignal: AbortSignal.timeout(20_000),
		});
		return {
			success: true,
			message: `Connected - ${modelLabel(model.model)} replied.`,
		};
	} catch (error) {
		return { success: false, message: describeAiError(error, provider) };
	}
}

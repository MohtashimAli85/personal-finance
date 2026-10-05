import type {
	LanguageModelV4,
	LanguageModelV4CallOptions,
} from "@ai-sdk/provider";
import type { AiProvider } from "@/lib/settings";
import { isKeyRejected } from "./errors";
import type { ResolvedModel } from "./models";

export interface FailedAttempt {
	provider: AiProvider;
	model: string;
	error: unknown;
}

export class AllModelsFailedError extends Error {
	constructor(readonly attempts: FailedAttempt[]) {
		super(
			attempts.length
				? `All AI models failed (${attempts.map((a) => a.model).join(", ")})`
				: "No AI model is configured",
		);
		this.name = "AllModelsFailedError";
	}

	get last(): FailedAttempt | undefined {
		return this.attempts.at(-1);
	}
}

/**
 * Tries each model in order until one accepts the request. Failures surface
 * when the provider responds (bad key, rate limit, outage, offline), before
 * any tokens stream, so falling through is invisible to the user. Once a model
 * answers, later steps of the same request start from it.
 */
export function createFallbackModel(
	models: ResolvedModel[],
	onModelUsed?: (model: ResolvedModel) => void,
): LanguageModelV4 {
	let startIndex = 0;
	const deadProviders = new Set<AiProvider>();

	async function attempt<T>(
		options: LanguageModelV4CallOptions,
		call: (model: LanguageModelV4) => PromiseLike<T>,
	): Promise<T> {
		const attempts: FailedAttempt[] = [];
		for (let index = startIndex; index < models.length; index++) {
			const entry = models[index];
			if (deadProviders.has(entry.provider)) continue;
			try {
				const result = await call(entry.languageModel);
				startIndex = index;
				onModelUsed?.(entry);
				return result;
			} catch (error) {
				if (options.abortSignal?.aborted) throw error;
				attempts.push({ provider: entry.provider, model: entry.model, error });
				if (isKeyRejected(error)) deadProviders.add(entry.provider);
				console.error(
					`[ai] ${entry.model} failed:`,
					error instanceof Error ? error.message.slice(0, 200) : error,
				);
			}
		}
		throw new AllModelsFailedError(attempts);
	}

	return {
		specificationVersion: "v4",
		provider: "fallback",
		modelId: models.map((m) => m.model).join(","),
		supportedUrls: {},
		doGenerate: (options) =>
			attempt(options, (model) => model.doGenerate(options)),
		doStream: (options) => attempt(options, (model) => model.doStream(options)),
	};
}

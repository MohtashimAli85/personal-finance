import { APICallError, RetryError } from "ai";
import type { AiProvider, ApiKeySource } from "@/lib/settings";
import { API_KEY_ENV_VARS, PROVIDER_LABELS } from "./labels";

const unwrap = (error: unknown): unknown =>
	RetryError.isInstance(error) ? error.lastError : error;

export const statusOf = (error: unknown): number | undefined => {
	const inner = unwrap(error);
	return APICallError.isInstance(inner) ? inner.statusCode : undefined;
};

export const isKeyRejected = (error: unknown) => {
	const status = statusOf(error);
	return status === 401 || status === 403;
};

const NETWORK_CODES = new Set([
	"ENOTFOUND",
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
	"EAI_AGAIN",
]);

function isNetworkError(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; current && depth < 5; depth++) {
		const code = (current as { code?: string }).code;
		if (code && NETWORK_CODES.has(code)) return true;
		if (current instanceof TypeError && /fetch failed/i.test(current.message))
			return true;
		current = (current as { cause?: unknown }).cause;
	}
	return false;
}

function describeRejectedKey(
	provider: AiProvider,
	source: ApiKeySource | undefined,
	inSettings: boolean,
): string {
	const name = PROVIDER_LABELS[provider];
	if (source === "env") {
		const envVar = API_KEY_ENV_VARS[provider];
		return inSettings
			? `${name} rejected the key in ${envVar}. Update it in your .env file and restart the app. A key saved on this page isn't used while that variable is set. Until then the coach skips ${name} and uses the next provider.`
			: `${name} rejected the key in ${envVar}. Update it in your .env file and restart the app.`;
	}
	return inSettings
		? `${name} rejected your saved key. It may be mistyped or revoked. Paste a new key above or remove this one.`
		: `${name} rejected your saved API key. Replace it in Settings.`;
}

export function describeAiError(
	error: unknown,
	provider: AiProvider,
	context: { source?: ApiKeySource; inSettings?: boolean } = {},
): string {
	const name = PROVIDER_LABELS[provider];
	const inner = unwrap(error);
	const status = statusOf(inner);

	if (status === 401 || status === 403) {
		return describeRejectedKey(provider, context.source, !!context.inSettings);
	}
	if (status === 429) {
		return `${name} rate limit or quota reached. Wait a minute and try again.`;
	}
	if (status !== undefined && status >= 500) {
		return `${name} is busy or down right now. Try again shortly.`;
	}
	if (inner instanceof Error && inner.name === "AbortError") {
		return `${name} took too long to respond.`;
	}
	if (isNetworkError(inner)) {
		return `Couldn't reach ${name}. Check your internet connection.`;
	}
	return `${name} request failed${status ? ` (HTTP ${status})` : ""}.`;
}

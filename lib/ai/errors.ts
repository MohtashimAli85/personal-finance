import { APICallError, RetryError } from "ai";
import type { AiProvider } from "@/lib/settings";
import { PROVIDER_LABELS } from "./models";

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

export function describeAiError(error: unknown, provider: AiProvider): string {
	const name = PROVIDER_LABELS[provider];
	const inner = unwrap(error);
	const status = statusOf(inner);

	if (status === 401 || status === 403) {
		return `${name} rejected the API key. Check it in Settings.`;
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

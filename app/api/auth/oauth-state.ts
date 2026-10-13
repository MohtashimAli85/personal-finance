import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const STATE_COOKIE = "google_oauth_state";
export const VERIFIER_COOKIE = "google_oauth_verifier";

const COOKIE_PATH = "/api/auth";
const MAX_AGE_SECONDS = 600;

export type OAuthClient = "desktop" | "web";

export function createState(client: OAuthClient) {
	return `${randomBytes(16).toString("hex")}.${client}`;
}

export function clientFromState(state: string | null): OAuthClient {
	return state?.endsWith(".desktop") ? "desktop" : "web";
}

export function statesMatch(
	expected: string | undefined,
	actual: string | null,
) {
	if (!expected || !actual) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(actual);
	return a.length === b.length && timingSafeEqual(a, b);
}

export function setOAuthCookies(
	response: NextResponse,
	values: { state: string; verifier: string },
	secure: boolean,
) {
	const options = {
		httpOnly: true,
		secure,
		sameSite: "lax" as const,
		path: COOKIE_PATH,
		maxAge: MAX_AGE_SECONDS,
	};
	response.cookies.set(STATE_COOKIE, values.state, options);
	response.cookies.set(VERIFIER_COOKIE, values.verifier, options);
}

export function clearOAuthCookies(response: NextResponse) {
	for (const name of [STATE_COOKIE, VERIFIER_COOKIE]) {
		response.cookies.set(name, "", { path: COOKIE_PATH, maxAge: 0 });
	}
}

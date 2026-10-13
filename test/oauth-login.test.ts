import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
	process.env.GOOGLE_CLIENT_ID = "id";
	process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

describe("google oauth login", () => {
	it("sets a state and verifier cookie matching the redirect params", async () => {
		const { GET } = await import("@/app/api/auth/google/login/route");
		const res = await GET(
			new Request("http://localhost:3000/api/auth/google/login?source=desktop"),
		);
		const location = new URL(res.headers.get("location") as string);
		const state = location.searchParams.get("state");
		const verifier = res.cookies.get("google_oauth_verifier")?.value as string;

		expect(state).toMatch(/^[0-9a-f]{32}\.desktop$/);
		expect(res.cookies.get("google_oauth_state")?.value).toBe(state);
		expect(location.searchParams.get("code_challenge")).toBe(
			createHash("sha256").update(verifier).digest("base64url"),
		);
	});
});

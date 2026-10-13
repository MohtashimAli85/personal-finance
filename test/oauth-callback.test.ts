import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gmail", () => ({
	getProfileEmail: async () => "me@example.com",
}));

const STATE = "abc123.web";
const fetchMock = vi.fn();

function callbackRequest(
	query: Record<string, string>,
	cookies: Record<string, string> = {},
) {
	const url = new URL("http://localhost:3000/api/auth/callback/google");
	for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
	const cookie = Object.entries(cookies)
		.map(([k, v]) => `${k}=${v}`)
		.join("; ");
	return new NextRequest(url, { headers: cookie ? { cookie } : {} });
}

async function callback(req: NextRequest) {
	const { GET } = await import("@/app/api/auth/callback/google/route");
	return GET(req);
}

beforeEach(() => {
	process.env.GOOGLE_CLIENT_ID = "id";
	process.env.GOOGLE_CLIENT_SECRET = "secret";
	process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(
		Response.json({
			access_token: "at",
			refresh_token: "rt",
			expires_in: 3600,
		}),
	);
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("google oauth callback state check", () => {
	it("rejects a missing state cookie without exchanging the code", async () => {
		const res = await callback(callbackRequest({ code: "c", state: STATE }));
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects a mismatched state without exchanging the code", async () => {
		const res = await callback(
			callbackRequest(
				{ code: "c", state: "evil.web" },
				{ google_oauth_state: STATE, google_oauth_verifier: "v" },
			),
		);
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("exchanges the code with the verifier when the state matches and clears the cookies", async () => {
		const res = await callback(
			callbackRequest(
				{ code: "c", state: STATE },
				{ google_oauth_state: STATE, google_oauth_verifier: "verifier" },
			),
		);
		expect(res.status).toBe(307);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
		expect(body.get("code_verifier")).toBe("verifier");
		expect(res.cookies.get("google_oauth_state")?.value).toBe("");
	});
});

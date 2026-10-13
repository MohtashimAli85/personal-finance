import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gmail", () => ({
	getProfileEmail: async () => "me@example.com",
}));

function post(origin?: string) {
	return new NextRequest("http://localhost:3000/api/auth/store-token", {
		method: "POST",
		headers: origin ? { origin } : {},
		body: JSON.stringify({ accessToken: "at" }),
	});
}

beforeEach(() => {
	process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

describe("store-token origin check", () => {
	it("rejects a missing or foreign origin", async () => {
		const { POST } = await import("@/app/api/auth/store-token/route");
		expect((await POST(post())).status).toBe(403);
		expect((await POST(post("https://evil.example"))).status).toBe(403);
	});

	it("accepts the app's own origin", async () => {
		const { POST } = await import("@/app/api/auth/store-token/route");
		const res = await POST(post("http://localhost:3000"));
		expect(res.status).toBe(200);
		expect(res.cookies.get("google_access_token")?.value).toBe("at");
	});
});

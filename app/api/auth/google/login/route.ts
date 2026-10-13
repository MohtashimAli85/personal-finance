import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createState, setOAuthCookies } from "../../oauth-state";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

	if (!clientId) {
		return NextResponse.json(
			{ error: "GOOGLE_CLIENT_ID is not configured." },
			{ status: 500 },
		);
	}

	const redirectUri = `${appUrl}/api/auth/callback/google`;
	const isDesktop = searchParams.get("source") === "desktop";

	const state = createState(isDesktop ? "desktop" : "web");
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");

	const params = new URLSearchParams({
		client_id: clientId,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: SCOPES.join(" "),
		access_type: "offline",
		prompt: "consent",
		state,
		code_challenge: challenge,
		code_challenge_method: "S256",
	});

	const response = NextResponse.redirect(
		`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
	);
	setOAuthCookies(response, { state, verifier }, appUrl.startsWith("https"));
	return response;
}

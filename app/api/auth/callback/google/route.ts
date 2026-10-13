import { type NextRequest, NextResponse } from "next/server";
import { getProfileEmail } from "@/lib/gmail";
import {
	clearOAuthCookies,
	clientFromState,
	STATE_COOKIE,
	statesMatch,
	VERIFIER_COOKIE,
} from "../../oauth-state";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
	const response = await handleCallback(request);
	clearOAuthCookies(response);
	return response;
}

async function handleCallback(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");

	if (!code) {
		return NextResponse.json(
			{ error: "Missing authorization code." },
			{ status: 400 },
		);
	}

	const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
	if (
		!verifier ||
		!statesMatch(request.cookies.get(STATE_COOKIE)?.value, state)
	) {
		return NextResponse.json(
			{ error: "Invalid OAuth state." },
			{ status: 400 },
		);
	}

	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const deepLinkScheme =
		process.env.ELECTRON_DEEP_LINK_SCHEME || "myfinanceapp";

	if (!clientId || !clientSecret) {
		return NextResponse.json(
			{ error: "Google OAuth is not configured." },
			{ status: 500 },
		);
	}

	const redirectUri = `${appUrl}/api/auth/callback/google`;
	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		code_verifier: verifier,
		grant_type: "authorization_code",
	});

	const tokenResponse = await fetch(TOKEN_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	const tokenData = await tokenResponse.json();
	if (!tokenResponse.ok || !tokenData.access_token) {
		return NextResponse.json(
			{ error: "Failed to exchange authorization code.", details: tokenData },
			{ status: tokenResponse.status },
		);
	}

	const accessToken = tokenData.access_token as string;
	const refreshToken = (tokenData.refresh_token as string | undefined) ?? null;
	const expiresIn = Number(tokenData.expires_in) || 3600;
	const email = await getProfileEmail(accessToken);

	if (clientFromState(state) === "desktop") {
		const redirect = `${deepLinkScheme}://oauth-callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken ?? "")}&expires_in=${expiresIn}`;
		return NextResponse.redirect(redirect);
	}

	const response = NextResponse.redirect(`${appUrl}/bank-transactions`);
	response.cookies.set("google_access_token", accessToken, {
		httpOnly: true,
		secure: appUrl.startsWith("https"),
		sameSite: "lax",
		path: "/",
	});
	response.cookies.set(
		"google_token_expiry",
		String(Date.now() + expiresIn * 1000),
		{
			httpOnly: true,
			secure: appUrl.startsWith("https"),
			sameSite: "lax",
			path: "/",
		},
	);
	if (refreshToken) {
		response.cookies.set("google_refresh_token", refreshToken, {
			httpOnly: true,
			secure: appUrl.startsWith("https"),
			sameSite: "lax",
			path: "/",
		});
	}
	if (email) {
		response.cookies.set("google_email", email, {
			httpOnly: false,
			secure: appUrl.startsWith("https"),
			sameSite: "lax",
			path: "/",
		});
	}
	return response;
}

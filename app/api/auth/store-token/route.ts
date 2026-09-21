import { type NextRequest, NextResponse } from "next/server";
import { getProfileEmail } from "@/lib/gmail";

export async function POST(request: NextRequest) {
	const body = (await request.json().catch(() => null)) as {
		accessToken?: string;
		refreshToken?: string;
		expiresIn?: number;
	} | null;

	const accessToken = body?.accessToken;
	if (!accessToken) {
		return NextResponse.json(
			{ error: "Missing access token." },
			{ status: 400 },
		);
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const secure = appUrl.startsWith("https");
	const expiresIn = Number(body.expiresIn) || 3600;
	const email = await getProfileEmail(accessToken);

	const response = NextResponse.json({ ok: true, email });
	response.cookies.set("google_access_token", accessToken, {
		httpOnly: true,
		secure,
		sameSite: "lax",
		path: "/",
	});
	response.cookies.set(
		"google_token_expiry",
		String(Date.now() + expiresIn * 1000),
		{
			httpOnly: true,
			secure,
			sameSite: "lax",
			path: "/",
		},
	);
	if (body.refreshToken) {
		response.cookies.set("google_refresh_token", body.refreshToken, {
			httpOnly: true,
			secure,
			sameSite: "lax",
			path: "/",
		});
	}
	if (email) {
		response.cookies.set("google_email", email, {
			httpOnly: false,
			secure,
			sameSite: "lax",
			path: "/",
		});
	}
	return response;
}

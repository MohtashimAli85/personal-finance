export interface RefreshedToken {
	accessToken: string;
	expiresIn: number;
}

// Google answers a dead refresh token with `invalid_grant`. That is not
// retryable - the only cure is a fresh consent - so it is modelled separately
// from transient network/5xx failures, which are worth retrying.
export class RefreshTokenRevokedError extends Error {
	constructor(detail: string) {
		super(
			`Gmail access needs to be re-authorized (${detail}). Sign in with Google again.`,
		);
		this.name = "RefreshTokenRevokedError";
	}
}

export async function refreshAccessToken(
	refreshToken: string,
): Promise<RefreshedToken> {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("Google OAuth is not configured.");
	}

	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});
	const data = await response.json().catch(() => null);

	if (!response.ok || !data?.access_token) {
		const error = data?.error ?? `HTTP ${response.status}`;
		const description = data?.error_description ?? "";
		console.error("Google token refresh failed:", { error, description });

		if (error === "invalid_grant") {
			throw new RefreshTokenRevokedError(description || error);
		}
		throw new Error(
			`Failed to refresh access token: ${error}${description ? ` - ${description}` : ""}`,
		);
	}

	return {
		accessToken: data.access_token as string,
		expiresIn: Number(data.expires_in) || 3600,
	};
}

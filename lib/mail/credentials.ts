import { cookies } from "next/headers";

export interface MailStatus {
	configured: boolean;
	email: string | null;
}

export async function getMailStatus(): Promise<MailStatus> {
	const store = await cookies();
	const accessToken = store.get("google_access_token")?.value;
	const refreshToken = store.get("google_refresh_token")?.value;
	const email = store.get("google_email")?.value ?? null;

	const configured = Boolean(accessToken) || Boolean(refreshToken);
	return { configured, email };
}

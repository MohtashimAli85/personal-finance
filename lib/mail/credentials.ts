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

// ============================================================================
// APP-PASSWORD FLOW (kept for reference / fallback)
// Stores the Gmail app password encrypted in SQLite using AES-256-GCM.
// ============================================================================
/*
import { db } from "@/lib/db";
import { mail_credentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function saveMailCredentials(email: string, appPassword: string) {
	const encrypted = encryptSecret(appPassword);
	const existing = db
		.select({ id: mail_credentials.id })
		.from(mail_credentials)
		.limit(1)
		.get();

	if (existing) {
		db.update(mail_credentials)
			.set({
				email,
				app_password: encrypted,
				updated_at: new Date().toISOString(),
			})
			.where(eq(mail_credentials.id, existing.id))
			.run();
	} else {
		db.insert(mail_credentials)
			.values({
				id: crypto.randomUUID(),
				email,
				app_password: encrypted,
			})
			.run();
	}

	return { configured: true, email };
}

export function clearMailCredentials() {
	db.delete(mail_credentials).run();
}

export function getMailCredentials() {
	return db.select().from(mail_credentials).limit(1).get() ?? null;
}

export function getDecryptedMailCredentials(): {
	email: string;
	appPassword: string;
} {
	const row = getMailCredentials();
	if (!row) throw new MailSecretError("Email not configured");
	return {
		email: row.email,
		appPassword: decryptSecret(row.app_password),
	};
}
*/

import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { app_settings } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { getSetting, setSetting } from "@/lib/settings";

const EMAIL_KEY = "mail_email";
const PASSWORD_KEY = "mail_app_password";

export interface MailCredentials {
	email: string;
	appPassword: string;
}

export interface MailStatus {
	configured: boolean;
	email: string | null;
}

export function getMailStatus(): MailStatus {
	const email = getSetting(EMAIL_KEY);
	return { configured: Boolean(email && getSetting(PASSWORD_KEY)), email };
}

export function getMailCredentials(): MailCredentials | null {
	const email = getSetting(EMAIL_KEY);
	const password = getSetting(PASSWORD_KEY);
	if (!email || !password) return null;
	return { email, appPassword: decryptSecret(password) };
}

export function storeMailCredentials({ email, appPassword }: MailCredentials) {
	db.transaction(() => {
		setSetting(EMAIL_KEY, email);
		setSetting(PASSWORD_KEY, encryptSecret(appPassword));
	});
}

export function clearMailCredentials() {
	db.delete(app_settings)
		.where(inArray(app_settings.key, [EMAIL_KEY, PASSWORD_KEY]))
		.run();
}

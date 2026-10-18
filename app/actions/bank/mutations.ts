"use server";

import { revalidatePath } from "next/cache";
import {
	clearMailCredentials,
	storeMailCredentials,
} from "@/lib/mail/credentials";
import { MailAuthError, verifyCredentials } from "@/lib/mail/imap";
import { hasSecretKey } from "@/lib/secrets";

export async function connectMail(payload: {
	email: string;
	appPassword: string;
}): Promise<ActionState> {
	const email = payload.email.trim().toLowerCase();
	const appPassword = payload.appPassword.replace(/\s/g, "");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return {
			success: false,
			errors: { email: { message: "Enter a valid email address." } },
		};
	}
	if (!/^[a-z]{16}$/i.test(appPassword)) {
		return {
			success: false,
			errors: {
				appPassword: {
					message: "An app password is 16 letters, like abcd efgh ijkl mnop.",
				},
			},
		};
	}
	if (!hasSecretKey()) {
		return {
			success: false,
			message:
				"No encryption key is configured, so the app password can't be stored securely. Set APP_SECRET_KEY (see README).",
		};
	}

	try {
		await verifyCredentials({ email, appPassword });
	} catch (error) {
		return {
			success: false,
			message:
				error instanceof MailAuthError
					? error.message
					: "Couldn't reach Gmail. Check your connection and that IMAP is enabled.",
		};
	}

	storeMailCredentials({ email, appPassword });
	revalidatePath("/bank-transactions");
	return { success: true, message: "Gmail connected." };
}

export async function disconnectMail() {
	clearMailCredentials();
	revalidatePath("/bank-transactions");
}

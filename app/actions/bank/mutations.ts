"use server";

import { z } from "zod";
import {
	clearMailCredentials,
	storeMailCredentials,
} from "@/lib/mail/credentials";
import { MailAuthError, verifyCredentials } from "@/lib/mail/imap";
import { hasSecretKey } from "@/lib/secrets";
import { serverAction } from "@/lib/server-action";
import { UserError } from "@/lib/user-error";

export const connectMail = serverAction(
	z.object({
		email: z
			.string()
			.trim()
			.toLowerCase()
			.pipe(z.email("Enter a valid email address.")),
		appPassword: z
			.string()
			.transform((value) => value.replace(/\s/g, ""))
			.pipe(
				z
					.string()
					.regex(
						/^[a-z]{16}$/i,
						"An app password is 16 letters, like abcd efgh ijkl mnop.",
					),
			),
	}),
	async (credentials) => {
		if (!hasSecretKey()) {
			throw new UserError(
				"No encryption key is configured, so the app password can't be stored securely. Set APP_SECRET_KEY (see README).",
			);
		}
		try {
			await verifyCredentials(credentials);
		} catch (error) {
			throw new UserError(
				error instanceof MailAuthError
					? error.message
					: "Couldn't reach Gmail. Check your connection and that IMAP is enabled.",
			);
		}
		storeMailCredentials(credentials);
		return { success: true, message: "Gmail connected." };
	},
);

export const disconnectMail = serverAction(z.void(), () => {
	clearMailCredentials();
});

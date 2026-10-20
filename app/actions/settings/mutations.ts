"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
	type ActualPreview,
	applyActualImport,
	previewActualImport as buildPreview,
	loadActualData,
} from "@/lib/actual-import";
import { describeAiError } from "@/lib/ai/errors";
import { modelLabel } from "@/lib/ai/labels";
import { availableModels, MODEL_CHAIN } from "@/lib/ai/models";
import { backupDatabase, backupDirFor } from "@/lib/db/backup";
import { dbPath, sqlite } from "@/lib/db/client";
import { restoreDatabase } from "@/lib/db/restore";
import { profileSchema } from "@/lib/profile-schema";
import { hasSecretKey } from "@/lib/secrets";
import { serverAction } from "@/lib/server-action";
import {
	AI_PROVIDERS,
	removeApiKey,
	storeApiKey,
	storeProfile,
} from "@/lib/settings";
import { UserError } from "@/lib/user-error";

const provider = z.enum(AI_PROVIDERS, { error: "Unknown provider." });

export const saveApiKey = serverAction(
	z.object({
		provider,
		apiKey: z
			.string()
			.trim()
			.min(20, "That doesn't look like an API key.")
			.max(300, "That doesn't look like an API key.")
			.regex(/^\S+$/, "That doesn't look like an API key."),
	}),
	({ provider, apiKey }) => {
		if (!hasSecretKey()) {
			throw new UserError(
				"No encryption key is configured, so API keys can't be stored securely. Set APP_SECRET_KEY (see README).",
			);
		}
		storeApiKey(provider, apiKey);
		return { success: true, message: "API key saved." };
	},
);

export const clearApiKey = serverAction(provider, (name) => {
	removeApiKey(name);
	return { success: true, message: "API key removed." };
});

export async function testAiConnection(name: string): Promise<ActionState> {
	const parsed = provider.safeParse(name);
	if (!parsed.success) return { success: false, message: "Unknown provider." };
	const [model] = availableModels(
		MODEL_CHAIN.filter((entry) => entry.provider === parsed.data),
	);
	if (!model) {
		return { success: false, message: "No usable API key for this provider." };
	}

	try {
		await generateText({
			model: model.languageModel,
			prompt: "Reply with the single word OK.",
			reasoning: "low",
			maxRetries: 0,
			abortSignal: AbortSignal.timeout(20_000),
		});
		return {
			success: true,
			message: `Connected - ${modelLabel(model.model)} replied.`,
		};
	} catch (error) {
		return { success: false, message: describeAiError(error, parsed.data) };
	}
}

export const saveProfile = serverAction(profileSchema, (profile) => {
	storeProfile(profile);
	return {
		success: true,
		message: "Saved. The coach will use this from your next message.",
	};
});

export type ActualPreviewResult =
	| { success: true; preview: ActualPreview }
	| { success: false; message: string };

const upload = z.instanceof(FormData).transform(async (formData, ctx) => {
	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0) {
		ctx.addIssue({ code: "custom", message: "Choose a file to import." });
		return z.NEVER;
	}
	return Buffer.from(await file.arrayBuffer());
});

export async function previewActualImport(
	formData: FormData,
): Promise<ActualPreviewResult> {
	const parsed = await upload.safeParseAsync(formData);
	if (!parsed.success) {
		return { success: false, message: parsed.error.issues[0].message };
	}
	try {
		return {
			success: true,
			preview: buildPreview(sqlite, loadActualData(parsed.data)),
		};
	} catch (error) {
		if (error instanceof UserError) {
			return { success: false, message: error.message };
		}
		throw error;
	}
}

export const importActualBudget = serverAction(upload, (bytes) => {
	const data = loadActualData(bytes);
	backupDatabase(sqlite, backupDirFor(dbPath), "actual-import");
	applyActualImport(sqlite, data);
	revalidatePath("/", "layout");
	redirect("/budget");
});

export const importBackup = serverAction(upload, (bytes) => {
	backupDatabase(sqlite, backupDirFor(dbPath), "restore");
	restoreDatabase(sqlite, bytes);
	revalidatePath("/", "layout");
	redirect("/");
});

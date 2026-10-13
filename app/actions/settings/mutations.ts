"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	ActualImportError,
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
import { RestoreError, restoreDatabase } from "@/lib/db/restore";
import { profileSchema } from "@/lib/profile-schema";
import { hasSecretKey } from "@/lib/secrets";
import {
	isAiProvider,
	removeApiKey,
	storeApiKey,
	storeProfile,
} from "@/lib/settings";

const revalidateSettings = () => {
	revalidatePath("/settings");
	revalidatePath("/chat");
};

export async function saveApiKey(
	_prev: ActionState,
	payload: { provider: string; apiKey: string },
): Promise<ActionState> {
	const { provider } = payload;
	const apiKey = payload.apiKey.trim();
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	if (!hasSecretKey()) {
		return {
			success: false,
			message:
				"No encryption key is configured, so API keys can't be stored securely. Set APP_SECRET_KEY (see README).",
		};
	}
	if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) {
		return {
			success: false,
			errors: { apiKey: { message: "That doesn't look like an API key." } },
		};
	}

	storeApiKey(provider, apiKey);
	revalidateSettings();
	return { success: true, message: "API key saved." };
}

export async function clearApiKey(provider: string): Promise<ActionState> {
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	removeApiKey(provider);
	revalidateSettings();
	return { success: true, message: "API key removed." };
}

export async function testAiConnection(provider: string): Promise<ActionState> {
	if (!isAiProvider(provider)) {
		return { success: false, message: "Unknown provider." };
	}
	const [model] = availableModels(
		MODEL_CHAIN.filter((entry) => entry.provider === provider),
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
		return { success: false, message: describeAiError(error, provider) };
	}
}

export async function saveProfile(
	_prev: ActionState,
	input: { name: string; about: string; style: string },
): Promise<ActionState> {
	const parsed = profileSchema.safeParse(input);
	if (!parsed.success) {
		const errors: ActionState["errors"] = {};
		for (const issue of parsed.error.issues) {
			errors[String(issue.path[0])] ??= { message: issue.message };
		}
		return { success: false, errors };
	}
	storeProfile(parsed.data);
	revalidatePath("/settings");
	return {
		success: true,
		message: "Saved. The coach will use this from your next message.",
	};
}

export type ActualPreviewResult =
	| { success: true; preview: ActualPreview }
	| { success: false; message: string };

async function readActualUpload(formData: FormData) {
	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0) {
		throw new ActualImportError("Choose a file to import.");
	}
	return loadActualData(Buffer.from(await file.arrayBuffer()));
}

export async function previewActualImport(
	formData: FormData,
): Promise<ActualPreviewResult> {
	try {
		const data = await readActualUpload(formData);
		return { success: true, preview: buildPreview(sqlite, data) };
	} catch (error) {
		if (error instanceof ActualImportError) {
			return { success: false, message: error.message };
		}
		throw error;
	}
}

export async function importActualBudget(
	formData: FormData,
): Promise<ActionState> {
	try {
		const data = await readActualUpload(formData);
		backupDatabase(sqlite, backupDirFor(dbPath), "actual-import");
		applyActualImport(sqlite, data);
	} catch (error) {
		if (error instanceof ActualImportError) {
			return { success: false, message: error.message };
		}
		throw error;
	}
	revalidatePath("/", "layout");
	redirect("/budget");
}

export async function importBackup(formData: FormData): Promise<ActionState> {
	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0) {
		return { success: false, message: "Choose a file to import." };
	}
	try {
		const bytes = Buffer.from(await file.arrayBuffer());
		backupDatabase(sqlite, backupDirFor(dbPath), "restore");
		restoreDatabase(sqlite, bytes);
	} catch (error) {
		if (error instanceof RestoreError) {
			return { success: false, message: error.message };
		}
		throw error;
	}
	revalidatePath("/", "layout");
	redirect("/");
}

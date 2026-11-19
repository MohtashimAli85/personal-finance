import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync, renameSync, rmSync } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { installedLocalModel, localModelPath, modelsDir } from "./model-file";
import { findLocalModel, LOCAL_MODELS, type LocalModelId } from "./models";

export interface LocalModelStatus {
	installed: LocalModelId | null;
	downloading: LocalModelId | null;
	received: number;
	total: number;
	error: string | null;
}

interface Download {
	id: LocalModelId;
	received: number;
	error: string | null;
	running: boolean;
}

// Server actions and pages can load this module in separate bundles, so the
// in-flight download lives on globalThis to stay shared.
const store = globalThis as typeof globalThis & {
	localModelDownload?: Download;
};

export function localModelStatus(): LocalModelStatus {
	const download = store.localModelDownload;
	return {
		installed: installedLocalModel()?.id ?? null,
		downloading: download?.running ? download.id : null,
		received: download?.received ?? 0,
		total: download ? findLocalModel(download.id).size : 0,
		error: download?.error ?? null,
	};
}

async function download(progress: Download) {
	const model = findLocalModel(progress.id);
	const target = localModelPath(model);
	const partial = `${target}.part`;
	mkdirSync(modelsDir(), { recursive: true });

	const response = await fetch(model.url);
	if (!response.ok || !response.body) {
		throw new Error(`Download failed (HTTP ${response.status}).`);
	}

	const hash = createHash("sha256");
	const meter = new Transform({
		transform(chunk: Buffer, _encoding, done) {
			hash.update(chunk);
			progress.received += chunk.length;
			done(null, chunk);
		},
	});
	await pipeline(
		Readable.fromWeb(response.body as ReadableStream),
		meter,
		createWriteStream(partial),
	);

	if (hash.digest("hex") !== model.sha256) {
		rmSync(partial, { force: true });
		throw new Error("The downloaded model was corrupted. Try again.");
	}
	removeLocalModel();
	renameSync(partial, target);
}

export function startLocalModelDownload(id: LocalModelId) {
	if (store.localModelDownload?.running) return;
	if (installedLocalModel()?.id === id) return;
	const progress: Download = { id, received: 0, error: null, running: true };
	store.localModelDownload = progress;
	download(progress)
		.catch((error: Error) => {
			progress.error = error.message;
		})
		.finally(() => {
			progress.running = false;
		});
}

export function removeLocalModel() {
	for (const model of LOCAL_MODELS) {
		rmSync(localModelPath(model), { force: true });
	}
}

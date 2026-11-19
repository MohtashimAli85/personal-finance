import { existsSync } from "node:fs";
import path from "node:path";
import { dbPath } from "@/lib/db/client";
import { LOCAL_MODELS, type LocalModel } from "./models";

export const modelsDir = () => path.join(path.dirname(dbPath), "models");

export const localModelPath = (model: LocalModel) =>
	path.join(modelsDir(), model.file);

/** The downloaded model, if any. Only one is kept on disk at a time. */
export const installedLocalModel = () =>
	LOCAL_MODELS.find((m) => existsSync(localModelPath(m))) ?? null;

import { useState, useTransition } from "react";
import {
	importActualBudget,
	previewActualImport,
} from "@/app/actions/settings/mutations";
import type { ActualPreview } from "@/lib/actual-import";

const toFormData = (file: File) => {
	const formData = new FormData();
	formData.set("file", file);
	return formData;
};

export function useActualImport() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<ActualPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const choose = (chosen: File) => {
		setError(null);
		startTransition(async () => {
			const result = await previewActualImport(toFormData(chosen));
			if (result.success) {
				setFile(chosen);
				setPreview(result.preview);
			} else {
				setError(result.message);
			}
		});
	};

	const cancel = () => {
		setFile(null);
		setPreview(null);
		setError(null);
	};

	const confirm = () => {
		if (!file) return;
		setError(null);
		startTransition(async () => {
			const result = await importActualBudget(toFormData(file));
			if (!result.success) setError(result.message ?? "Import failed.");
		});
	};

	return { file, preview, error, isPending, choose, cancel, confirm };
}

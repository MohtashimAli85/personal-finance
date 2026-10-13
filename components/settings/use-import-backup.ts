import { useState, useTransition } from "react";
import { importBackup } from "@/app/actions/settings/mutations";

export function useImportBackup() {
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const choose = (chosen: File) => {
		setError(null);
		setFile(chosen);
	};

	const cancel = () => {
		setFile(null);
		setError(null);
	};

	const confirm = () => {
		if (!file) return;
		setError(null);
		startTransition(async () => {
			const formData = new FormData();
			formData.set("file", file);
			const result = await importBackup(formData);
			if (!result.success) setError(result.message ?? "Import failed.");
		});
	};

	return { file, error, isPending, choose, cancel, confirm };
}

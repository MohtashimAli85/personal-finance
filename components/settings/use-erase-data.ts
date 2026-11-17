import { useState, useTransition } from "react";
import { eraseAllData } from "@/app/actions/settings/mutations";

export const ERASE_CONFIRMATION = "erase";

export function useEraseData() {
	const [open, setOpen] = useState(false);
	const [typed, setTyped] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const changeOpen = (next: boolean) => {
		if (isPending) return;
		setOpen(next);
		setTyped("");
		setError(null);
	};

	const confirm = () => {
		setError(null);
		startTransition(async () => {
			const result = await eraseAllData(typed);
			if (!result.success) setError(result.message ?? "Erase failed.");
		});
	};

	return {
		open,
		changeOpen,
		typed,
		setTyped,
		error,
		isPending,
		canConfirm: typed.trim() === ERASE_CONFIRMATION && !isPending,
		confirm,
	};
}

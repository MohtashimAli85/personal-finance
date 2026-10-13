import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
	rescanBankTransactions,
	syncBankTransactions,
} from "@/app/actions/bank/sync";
import type { SyncStatus } from "./status-banner";
import { useElectronOAuth } from "./use-electron-oauth";

export function useBankSync() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [status, setStatus] = useState<SyncStatus | null>(null);

	useElectronOAuth(
		useCallback((text: string) => setStatus({ tone: "error", text }), []),
	);

	const fail = (result: { error: string; needsReauth?: boolean }) => {
		setStatus({
			tone: "error",
			text: result.error,
			needsReauth: result.needsReauth,
		});
		if (result.needsReauth) router.refresh();
	};

	const sync = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await syncBankTransactions();
			if (!result.success) return fail(result);
			setStatus({
				tone: "success",
				text:
					result.inserted > 0
						? `Imported ${result.inserted} new transaction${result.inserted === 1 ? "" : "s"}`
						: "You're all caught up — no new transactions",
			});
			router.refresh();
		});
	};

	const rescan = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await rescanBankTransactions();
			if (!result.success) return fail(result);
			const parts = [`Re-read ${result.scanned} bank emails`];
			if (result.inserted > 0) {
				parts.push(
					`recovered ${result.inserted} missing transaction${result.inserted === 1 ? "" : "s"}`,
				);
			}
			if (result.repaired > 0) {
				parts.push(`fixed ${result.repaired} description(s)`);
			}
			if (result.inserted === 0 && result.repaired === 0) {
				parts.push("nothing was missing");
			}
			setStatus({ tone: "success", text: `${parts.join(" — ")}.` });
			router.refresh();
		});
	};

	return { status, isPending, startTransition, sync, rescan };
}

import { useState, useTransition } from "react";
import { syncBankTransactions } from "@/app/actions/bank/sync";
import { actionError } from "@/lib/action-result";
import type { SyncStatus } from "./status-banner";
import { useAiRefine } from "./use-ai-refine";

export function useBankSync() {
	const [isPending, startTransition] = useTransition();
	const [status, setStatus] = useState<SyncStatus | null>(null);
	const { isRefining, refine } = useAiRefine();

	const sync = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await syncBankTransactions();
			if (!result.success) {
				return setStatus({ tone: "error", text: actionError(result) });
			}
			const inserted = Number(result.payload?.inserted ?? 0);
			setStatus({
				tone: "success",
				text:
					inserted > 0
						? `Imported ${inserted} new transaction${inserted === 1 ? "" : "s"}`
						: "You're all caught up — no new transactions",
			});
			// Not awaited: names improve in the background without holding the button.
			void refine();
		});
	};

	return { status, isPending, isRefining, startTransition, sync };
}

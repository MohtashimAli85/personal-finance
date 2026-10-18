import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncBankTransactions } from "@/app/actions/bank/sync";
import type { SyncStatus } from "./status-banner";
import { useAiRefine } from "./use-ai-refine";

export function useBankSync() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [status, setStatus] = useState<SyncStatus | null>(null);
	const { isRefining, refine } = useAiRefine();

	const sync = () => {
		startTransition(async () => {
			setStatus(null);
			const result = await syncBankTransactions();
			if (!result.success) {
				return setStatus({ tone: "error", text: result.error });
			}
			setStatus({
				tone: "success",
				text:
					result.inserted > 0
						? `Imported ${result.inserted} new transaction${result.inserted === 1 ? "" : "s"}`
						: "You're all caught up — no new transactions",
			});
			router.refresh();
			// Not awaited: names improve in the background without holding the button.
			void refine();
		});
	};

	return { status, isPending, isRefining, startTransition, sync };
}

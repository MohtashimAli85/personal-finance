import { useTransition } from "react";
import { toast } from "sonner";
import { syncBankTransactions } from "@/app/actions/bank/sync";
import { actionError } from "@/lib/action-result";
import { plural } from "@/lib/helper";
import { useAiRefine } from "./use-ai-refine";

export function useBankSync() {
	const [isPending, startTransition] = useTransition();
	const { isRefining, refine } = useAiRefine();

	const sync = () => {
		startTransition(async () => {
			const result = await syncBankTransactions();
			if (!result.success) {
				toast.error(actionError(result));
				return;
			}
			const inserted = Number(result.payload?.inserted ?? 0);
			toast.success(
				inserted > 0
					? `Imported ${plural(inserted, "new transaction")}`
					: "You're all caught up. No new transactions.",
			);
			// Not awaited: names improve in the background without holding the button.
			void refine();
		});
	};

	return { isPending, isRefining, startTransition, sync };
}

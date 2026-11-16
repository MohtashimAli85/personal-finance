"use client";

import { toast } from "sonner";
import {
	bulkDeleteTransactions,
	undoDeleteTransactions,
} from "@/app/actions/transaction/mutations";
import { useServerAction } from "@/hooks/use-server-action";
import { toastOnError } from "@/lib/action-result";
import { plural } from "@/lib/helper";

const TOAST_ID = "transactions-deleted";

async function undo(token: string) {
	const result = await toastOnError(undoDeleteTransactions(token));
	if (!result.success) return;
	const restored = Number(result.payload?.restored ?? 0);
	toast.success(`Restored ${plural(restored, "transaction")}`, {
		id: TOAST_ID,
	});
}

export function useDeleteTransactions() {
	const { isPending, run } = useServerAction();

	const remove = (ids: string[], onDone?: () => void) =>
		run(
			() => bulkDeleteTransactions(ids),
			(result) => {
				onDone?.();
				const token = String(result.payload?.undoToken ?? "");
				toast.success(`Deleted ${plural(ids.length, "transaction")}`, {
					id: TOAST_ID,
					duration: 10000,
					action: { label: "Undo", onClick: () => undo(token) },
				});
			},
		);

	return { isPending, remove };
}

"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { exportTransactions } from "@/app/actions/transaction/mutations";
import { toDateKey } from "@/lib/date";

function download(csv: string) {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `transactions-${toDateKey(new Date())}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export function useExportTransactions(accountId?: string) {
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const handleExport = () =>
		startTransition(async () => {
			const csv = await exportTransactions({
				...Object.fromEntries(searchParams),
				accountId,
			});
			if (csv) download(csv);
			else toast.info("There are no transactions to export.");
		});

	return { isPending, handleExport };
}

import { useState } from "react";
import { bulkImportTransactions } from "@/app/actions/transaction/mutations";
import { useStore } from "@/context/store-context";
import { useServerAction } from "@/hooks/use-server-action";
import { useCsvFile } from "./use-csv-file";
import { useImportPreview } from "./use-import-preview";
import { useImportRows } from "./use-import-rows";

export function useImportTransactions(defaultAccountId?: string) {
	const accounts = useStore((s) => s.accounts);
	const [open, setOpen] = useState(false);
	const { isPending, run } = useServerAction();
	const [selectedAccountId, setSelectedAccountId] = useState(
		defaultAccountId ?? "",
	);
	const [importResult, setImportResult] = useState<{
		imported: number;
		skippedInvalidDate: number;
		duplicates: number;
	} | null>(null);

	const csv = useCsvFile();
	const rows = useImportRows(csv.columns, csv.rawRows, csv.columnMap);
	const preview = useImportPreview(selectedAccountId, rows.importRows);

	const resetState = () => {
		csv.reset();
		rows.setFlipAmount(false);
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (next) setImportResult(null);
		else resetState();
	};

	const handleImport = () => {
		if (!selectedAccountId || rows.dataRows.length === 0) return;
		run(
			() =>
				bulkImportTransactions({
					accountId: selectedAccountId,
					rows: rows.importRows,
				}),
			(result) => {
				setOpen(false);
				resetState();
				setImportResult({
					imported: Number(result.payload?.inserted ?? 0),
					skippedInvalidDate: rows.skippedInvalidDate,
					duplicates: Number(result.payload?.duplicates ?? 0),
				});
			},
		);
	};

	return {
		accounts,
		open,
		isPending,
		selectedAccountId,
		setSelectedAccountId,
		importResult,
		csv,
		rows,
		preview,
		handleOpenChange,
		handleImport,
	};
}

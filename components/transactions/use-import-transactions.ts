import { useState } from "react";
import { toast } from "sonner";
import { bulkImportTransactions } from "@/app/actions/transaction/mutations";
import { useStore } from "@/context/store-context";
import { useServerAction } from "@/hooks/use-server-action";
import { plural } from "@/lib/helper";
import { useCsvFile } from "./use-csv-file";
import { useImportPreview } from "./use-import-preview";
import { useImportRows } from "./use-import-rows";

function importSummary(
	imported: number,
	duplicates: number,
	unreadable: number,
) {
	const skipped = [
		duplicates > 0 && plural(duplicates, "duplicate"),
		unreadable > 0 && `${plural(unreadable, "row")} with an unreadable date`,
	].filter(Boolean);
	const summary = `Imported ${plural(imported, "transaction")}`;
	return skipped.length
		? `${summary}. Skipped ${skipped.join(" and ")}.`
		: `${summary}.`;
}

export function useImportTransactions(defaultAccountId?: string) {
	const accounts = useStore((s) => s.accounts);
	const [open, setOpen] = useState(false);
	const { isPending, run } = useServerAction();
	const [selectedAccountId, setSelectedAccountId] = useState(
		defaultAccountId ?? "",
	);
	const csv = useCsvFile();
	const rows = useImportRows(csv.columns, csv.rawRows, csv.columnMap);
	const preview = useImportPreview(selectedAccountId, rows.importRows);

	const resetState = () => {
		csv.reset();
		rows.setFlipAmount(false);
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) resetState();
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
				toast.success(
					importSummary(
						Number(result.payload?.inserted ?? 0),
						Number(result.payload?.duplicates ?? 0),
						rows.skippedInvalidDate,
					),
				);
			},
		);
	};

	return {
		accounts,
		open,
		isPending,
		selectedAccountId,
		setSelectedAccountId,
		csv,
		rows,
		preview,
		handleOpenChange,
		handleImport,
	};
}

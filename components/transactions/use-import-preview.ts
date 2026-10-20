import { useEffect, useState } from "react";
import {
	type ImportRow,
	previewImport,
} from "@/app/actions/transaction/mutations";

type Preview = { newCount: number; duplicates: number };

export function useImportPreview(accountId: string, importRows: ImportRow[]) {
	const [preview, setPreview] = useState<
		(Preview & { rows: ImportRow[]; accountId: string }) | null
	>(null);

	useEffect(() => {
		if (!accountId || importRows.length === 0) return;
		let cancelled = false;
		previewImport({ accountId, rows: importRows }).then((result) => {
			if (!cancelled) setPreview({ rows: importRows, accountId, ...result });
		});
		return () => {
			cancelled = true;
		};
	}, [accountId, importRows]);

	if (importRows.length === 0) return { newCount: 0, duplicates: 0 };
	return preview?.rows === importRows && preview.accountId === accountId
		? preview
		: null;
}

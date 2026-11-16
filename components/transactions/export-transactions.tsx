"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useExportTransactions } from "./use-export-transactions";

export default function ExportTransactions({
	accountId,
}: {
	accountId?: string;
}) {
	const { isPending, handleExport } = useExportTransactions(accountId);

	return (
		<Button variant="outline" onClick={handleExport} disabled={isPending}>
			{isPending ? <Spinner /> : <Download />}
			<span className="max-sm:sr-only">Export</span>
		</Button>
	);
}

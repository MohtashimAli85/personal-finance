"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import ImportFooter from "./import-footer";
import ImportOptions from "./import-options";
import ImportPreviewTable from "./import-preview-table";
import { useImportTransactions } from "./use-import-transactions";

export default function ImportTransactions({
	accountId,
}: {
	accountId?: string;
}) {
	const {
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
	} = useImportTransactions(accountId);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Upload />
					<span className="max-sm:sr-only">Import</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Import transactions (CSV)</DialogTitle>
					<DialogDescription>
						Upload a CSV file and map columns to transaction fields.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-end gap-4">
					<div className="flex-1 space-y-1.5">
						<Label>CSV File</Label>
						<input
							key={csv.inputKey}
							type="file"
							accept=".csv,.txt"
							onChange={csv.handleFileChange}
							className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm file:text-foreground file:border-0 file:bg-transparent file:font-medium"
						/>
					</div>
					<div className="w-48 space-y-1.5">
						<Label>Account</Label>
						<Select
							value={selectedAccountId}
							onValueChange={setSelectedAccountId}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select account" />
							</SelectTrigger>
							<SelectContent>
								{accounts?.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{csv.rawRows.length > 0 && (
					<>
						<ImportPreviewTable
							columns={csv.columns}
							rows={rows.previewRows}
							columnMap={csv.columnMap}
							onColumnChange={csv.updateColumnMap}
						/>
						<ImportOptions
							dateFormat={rows.dateFormat}
							onDateFormatChange={rows.setDateFormat}
							delimiter={csv.delimiter}
							onDelimiterChange={csv.handleDelimiterChange}
							hasHeader={rows.hasHeader}
							onHasHeaderChange={rows.setHasHeader}
							flipAmount={rows.flipAmount}
							onFlipAmountChange={rows.setFlipAmount}
						/>
					</>
				)}

				<DialogFooter>
					{rows.dataRows.length > 0 && selectedAccountId && (
						<ImportFooter
							isPending={isPending}
							skippedInvalidDate={rows.skippedInvalidDate}
							preview={preview}
							onImport={handleImport}
						/>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import {
	bulkImportTransactions,
	type ImportRow,
} from "@/app/actions/transaction/mutations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useStore } from "@/context/store-context";
import {
	autoMapColumns,
	DATE_FORMATS,
	detectDelimiter,
	type MappableField,
	parseCSV,
	parseDate,
} from "@/lib/csv";

const FIELD_OPTIONS: { value: MappableField; label: string }[] = [
	{ value: "skip", label: "Skip" },
	{ value: "date", label: "Date" },
	{ value: "notes", label: "Notes" },
	{ value: "category", label: "Category" },
	{ value: "category_group", label: "Category Group" },
	{ value: "amount", label: "Amount" },
	{ value: "payment", label: "Payment" },
	{ value: "deposit", label: "Deposit" },
];

const DELIMITER_OPTIONS = [
	{ value: ",", label: "Comma (,)" },
	{ value: ";", label: "Semicolon (;)" },
	{ value: "\t", label: "Tab" },
	{ value: "|", label: "Pipe (|)" },
];

export default function ImportTransactions({
	accountId,
}: {
	accountId?: string;
}) {
	const accounts = useStore((s) => s.accounts);
	const fileRef = useRef<HTMLInputElement>(null);

	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	// CSV state
	const [rawRows, setRawRows] = useState<string[][]>([]);
	const [headers, setHeaders] = useState<string[]>([]);
	const [columnMap, setColumnMap] = useState<MappableField[]>([]);

	// Options
	const [delimiter, setDelimiter] = useState(",");
	const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
	const [hasHeader, setHasHeader] = useState(true);
	const [flipAmount, setFlipAmount] = useState(false);
	const [selectedAccountId, setSelectedAccountId] = useState(accountId ?? "");
	const [importResult, setImportResult] = useState<{
		imported: number;
		skippedInvalidDate: number;
		duplicates: number;
	} | null>(null);

	const handleFileRead = (text: string) => {
		const detectedDelimiter = detectDelimiter(text.split("\n")[0] || "");
		setDelimiter(detectedDelimiter);
		const parsed = parseCSV(text, detectedDelimiter);
		if (parsed.length === 0) return;

		const headerRow = parsed[0];
		const dataRows = parsed.slice(1);
		setHeaders(headerRow);
		setRawRows(dataRows);
		setColumnMap(autoMapColumns(headerRow));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				handleFileRead(reader.result);
			}
		};
		reader.readAsText(file);
	};

	// Reparse when delimiter changes
	const handleDelimiterChange = (d: string) => {
		setDelimiter(d);
		if (fileRef.current?.files?.[0]) {
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === "string") {
					const parsed = parseCSV(reader.result, d);
					if (parsed.length === 0) return;
					setHeaders(parsed[0]);
					setRawRows(parsed.slice(1));
					setColumnMap(autoMapColumns(parsed[0]));
				}
			};
			reader.readAsText(fileRef.current.files[0]);
		}
	};

	const updateColumnMap = (index: number, value: MappableField) => {
		const next = [...columnMap];
		next[index] = value;
		setColumnMap(next);
	};

	const dataRows = hasHeader
		? rawRows
		: rawRows.length > 0
			? [headers, ...rawRows]
			: [];
	const previewRows = dataRows.slice(0, 10);
	const totalRows = dataRows.length;

	// Build import rows from mapped columns. Rows whose date column can't be
	// parsed are dropped rather than silently dated "today" - buildImportRows
	// reports how many so the user can see and fix the source file.
	const buildImportRows = (): {
		rows: ImportRow[];
		skippedInvalidDate: number;
	} => {
		let skippedInvalidDate = 0;
		const rows: ImportRow[] = [];

		for (const row of dataRows) {
			let date: string | null = null;
			const record: Partial<ImportRow> = {};

			for (let i = 0; i < columnMap.length; i++) {
				const field = columnMap[i];
				const value = row[i]?.trim() || "";
				if (!value || field === "skip") continue;

				switch (field) {
					case "date":
						date = parseDate(value, dateFormat);
						break;
					case "notes":
						record.notes = value;
						break;
					case "category":
						record.category_name = value;
						break;
					case "category_group":
						record.category_group_name = value;
						break;
					case "amount": {
						let num = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
						if (Number.isNaN(num)) break;
						if (flipAmount) num = -num;
						if (num < 0) {
							record.payment = Math.abs(num);
						} else {
							record.deposit = num;
						}
						break;
					}
					case "payment": {
						const p = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
						if (!Number.isNaN(p) && p !== 0) record.payment = Math.abs(p);
						break;
					}
					case "deposit": {
						const d = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
						if (!Number.isNaN(d) && d !== 0) record.deposit = Math.abs(d);
						break;
					}
				}
			}

			if (!date) {
				skippedInvalidDate += 1;
				continue;
			}
			rows.push({ ...record, date });
		}

		return { rows, skippedInvalidDate };
	};

	const handleImport = () => {
		if (!selectedAccountId || totalRows === 0) return;
		startTransition(async () => {
			const { rows, skippedInvalidDate } = buildImportRows();
			const result = await bulkImportTransactions(selectedAccountId, rows);
			setOpen(false);
			resetState();
			setImportResult({
				imported: result.inserted,
				skippedInvalidDate,
				duplicates: result.duplicates,
			});
		});
	};

	const resetState = () => {
		setRawRows([]);
		setHeaders([]);
		setColumnMap([]);
		setFlipAmount(false);
		if (fileRef.current) fileRef.current.value = "";
	};

	return (
		<div className="flex items-center gap-2">
			<Dialog
				open={open}
				onOpenChange={(v) => {
					setOpen(v);
					if (!v) resetState();
					if (v) setImportResult(null);
				}}
			>
				<DialogTrigger asChild>
					<Button variant="outline" size="sm">
						<Upload className="size-3.5" />
						Import
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Import transactions (CSV)</DialogTitle>
						<DialogDescription>
							Upload a CSV file and map columns to transaction fields.
						</DialogDescription>
					</DialogHeader>

					{/* File + Account row */}
					<div className="flex items-end gap-4">
						<div className="flex-1 space-y-1.5">
							<Label>CSV File</Label>
							<input
								ref={fileRef}
								type="file"
								accept=".csv,.txt"
								onChange={handleFileChange}
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

					{/* Preview table with column mapping */}
					{rawRows.length > 0 && (
						<>
							<div className="flex flex-col min-w-0 max-h-72 rounded-lg border">
								<Table scrollable>
									<TableHeader>
										<TableRow>
											{headers.map((h, i) => (
												<TableHead key={h + i} className="min-w-32 py-2">
													<div className="space-y-1.5">
														<span className="text-xs text-muted-foreground">
															{h}
														</span>
														<Select
															value={columnMap[i] || "skip"}
															onValueChange={(v: string) =>
																updateColumnMap(i, v as MappableField)
															}
														>
															<SelectTrigger size="sm" className="w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{FIELD_OPTIONS.map((opt) => (
																	<SelectItem key={opt.value} value={opt.value}>
																		{opt.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
												</TableHead>
											))}
										</TableRow>
									</TableHeader>
									<TableBody>
										{previewRows.map((row, ri) => (
											<TableRow key={ri}>
												{row.map((cell, ci) => (
													<TableCell
														key={ci}
														className="px-2 py-1.5 text-xs truncate max-w-48"
													>
														{cell}
													</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Options */}
							<div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<Label className="w-24 shrink-0">Date format</Label>
										<Select value={dateFormat} onValueChange={setDateFormat}>
											<SelectTrigger size="sm">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{DATE_FORMATS.map((f) => (
													<SelectItem key={f} value={f}>
														{f}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-center gap-3">
										<Label className="w-24 shrink-0">Delimiter</Label>
										<Select
											value={delimiter}
											onValueChange={handleDelimiterChange}
										>
											<SelectTrigger size="sm">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{DELIMITER_OPTIONS.map((d) => (
													<SelectItem key={d.value} value={d.value}>
														{d.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-3">
									<Label className="flex items-center gap-2">
										<Checkbox
											checked={hasHeader}
											onCheckedChange={(v) => setHasHeader(v === true)}
										/>
										File has header row
									</Label>
									<Label className="flex items-center gap-2">
										<Checkbox
											checked={flipAmount}
											onCheckedChange={(v) => setFlipAmount(v === true)}
										/>
										Flip amount sign
									</Label>
								</div>
							</div>
						</>
					)}

					<DialogFooter>
						{totalRows > 0 && (
							<Button
								onClick={handleImport}
								disabled={!selectedAccountId || isPending}
							>
								<Download className="size-3.5" />
								{isPending
									? "Importing..."
									: `Import ${totalRows} transaction${totalRows !== 1 ? "s" : ""}`}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{importResult && (
				<div className="text-xs text-muted-foreground">
					Imported {importResult.imported}
					{importResult.duplicates > 0 &&
						`, skipped ${importResult.duplicates} duplicate${importResult.duplicates !== 1 ? "s" : ""}`}
					{importResult.skippedInvalidDate > 0 &&
						`, skipped ${importResult.skippedInvalidDate} row${importResult.skippedInvalidDate !== 1 ? "s" : ""} with an unreadable date`}
					.
				</div>
			)}
		</div>
	);
}

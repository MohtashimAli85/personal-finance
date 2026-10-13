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
import type { MappableField } from "@/lib/csv";
import type { CsvColumn, CsvRow } from "./use-csv-file";

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

export default function ImportPreviewTable({
	columns,
	rows,
	columnMap,
	onColumnChange,
}: {
	columns: CsvColumn[];
	rows: CsvRow[];
	columnMap: MappableField[];
	onColumnChange: (index: number, value: MappableField) => void;
}) {
	return (
		<div className="flex flex-col min-w-0 max-h-72 rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map((column, i) => (
							<TableHead key={column.id} className="min-w-32 py-2">
								<div className="space-y-1.5">
									<span className="text-xs text-muted-foreground">
										{column.header}
									</span>
									<Select
										value={columnMap[i] || "skip"}
										onValueChange={(v: string) =>
											onColumnChange(i, v as MappableField)
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
					{rows.map((row) => (
						<TableRow key={row.id}>
							{columns.map((column, ci) => (
								<TableCell
									key={column.id}
									className="px-2 py-1.5 text-xs truncate max-w-48"
								>
									{row.cells[ci]}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

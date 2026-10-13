import { type MappableField, parseDate } from "@/lib/csv";
import type { ImportRow } from "@/lib/csv-import";

export function parseAmount(value: string): number | null {
	const num = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
	if (Number.isNaN(num)) return null;
	return /^\(.*\)$/.test(value.trim()) ? -Math.abs(num) : num;
}

export function buildImportRows(
	dataRows: string[][],
	columnMap: MappableField[],
	dateFormat: string,
	flipAmount: boolean,
): { rows: ImportRow[]; skippedInvalidDate: number } {
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
					const parsed = parseAmount(value);
					if (parsed === null) break;
					const num = flipAmount ? -parsed : parsed;
					if (num < 0) record.payment = Math.abs(num);
					else record.deposit = num;
					break;
				}
				case "payment": {
					const parsed = parseAmount(value);
					if (parsed) record.payment = Math.abs(parsed);
					break;
				}
				case "deposit": {
					const parsed = parseAmount(value);
					if (parsed) record.deposit = Math.abs(parsed);
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
}

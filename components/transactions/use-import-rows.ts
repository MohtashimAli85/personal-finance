import { useMemo, useState } from "react";
import type { MappableField } from "@/lib/csv";
import { buildImportRows } from "@/lib/csv-import-rows";
import type { CsvColumn, CsvRow } from "./use-csv-file";

const HEADER_ROW_ID = "header";

export function useImportRows(
	columns: CsvColumn[],
	rawRows: CsvRow[],
	columnMap: MappableField[],
) {
	const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
	const [hasHeader, setHasHeader] = useState(true);
	const [flipAmount, setFlipAmount] = useState(false);

	const dataRows = useMemo<CsvRow[]>(() => {
		if (hasHeader) return rawRows;
		if (rawRows.length === 0) return [];
		return [
			{ id: HEADER_ROW_ID, cells: columns.map((c) => c.header) },
			...rawRows,
		];
	}, [hasHeader, rawRows, columns]);

	const { rows: importRows, skippedInvalidDate } = useMemo(
		() =>
			buildImportRows(
				dataRows.map((r) => r.cells),
				columnMap,
				dateFormat,
				flipAmount,
			),
		[dataRows, columnMap, dateFormat, flipAmount],
	);

	return {
		dateFormat,
		setDateFormat,
		hasHeader,
		setHasHeader,
		flipAmount,
		setFlipAmount,
		dataRows,
		previewRows: dataRows.slice(0, 10),
		importRows,
		skippedInvalidDate,
	};
}

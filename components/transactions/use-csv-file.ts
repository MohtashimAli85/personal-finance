import { useRef, useState } from "react";
import type { MappableField } from "@/lib/csv";
import { autoMapColumns, detectDelimiter, parseCSV } from "@/lib/csv";

export type CsvColumn = { id: string; header: string };
export type CsvRow = { id: string; cells: string[] };

export function useCsvFile() {
	const [inputKey, setInputKey] = useState(0);
	const textRef = useRef<string | null>(null);
	const [delimiter, setDelimiter] = useState(",");
	const [columns, setColumns] = useState<CsvColumn[]>([]);
	const [rawRows, setRawRows] = useState<CsvRow[]>([]);
	const [columnMap, setColumnMap] = useState<MappableField[]>([]);

	const load = (text: string, nextDelimiter: string) => {
		const parsed = parseCSV(text, nextDelimiter);
		if (parsed.length === 0) return;
		setColumns(
			parsed[0].map((header) => ({ id: crypto.randomUUID(), header })),
		);
		setRawRows(
			parsed.slice(1).map((cells) => ({ id: crypto.randomUUID(), cells })),
		);
		setColumnMap(autoMapColumns(parsed[0]));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result !== "string") return;
			textRef.current = reader.result;
			const detected = detectDelimiter(reader.result.split("\n")[0] || "");
			setDelimiter(detected);
			load(reader.result, detected);
		};
		reader.readAsText(file);
	};

	const handleDelimiterChange = (next: string) => {
		setDelimiter(next);
		if (textRef.current) load(textRef.current, next);
	};

	const updateColumnMap = (index: number, value: MappableField) =>
		setColumnMap((prev) => prev.map((f, i) => (i === index ? value : f)));

	const reset = () => {
		textRef.current = null;
		setColumns([]);
		setRawRows([]);
		setColumnMap([]);
		setInputKey((k) => k + 1);
	};

	return {
		inputKey,
		delimiter,
		columns,
		rawRows,
		columnMap,
		handleFileChange,
		handleDelimiterChange,
		updateColumnMap,
		reset,
	};
}

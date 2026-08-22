/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseLine(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (inQuotes) {
			if (char === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++; // skip escaped quote
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === delimiter) {
			fields.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	fields.push(current.trim());
	return fields;
}

/**
 * Parse CSV text into a 2D array of strings.
 */
export function parseCSV(text: string, delimiter = ","): string[][] {
	// Normalize line endings and strip BOM
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
	return lines.map((line) => parseLine(line, delimiter));
}

/**
 * Serialize rows into a CSV string.
 */
export function serializeCSV(headers: string[], rows: string[][]): string {
	const escape = (value: string) => {
		if (value.includes(",") || value.includes('"') || value.includes("\n")) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	};
	const lines = [headers.map(escape).join(",")];
	for (const row of rows) {
		lines.push(row.map(escape).join(","));
	}
	return lines.join("\n");
}

/**
 * Auto-detect delimiter by counting occurrences in first line.
 */
export function detectDelimiter(firstLine: string): string {
	const candidates = [",", ";", "\t", "|"];
	let best = ",";
	let bestCount = 0;
	for (const d of candidates) {
		const count = firstLine.split(d).length - 1;
		if (count > bestCount) {
			bestCount = count;
			best = d;
		}
	}
	return best;
}

const FIELD_ALIASES: Record<string, string> = {
	date: "date",
	time: "date",
	timestamp: "date",
	notes: "notes",
	note: "notes",
	memo: "notes",
	description: "notes",
	payee: "notes",
	category: "category",
	group: "category",
	amount: "amount",
	total: "amount",
	sum: "amount",
	value: "amount",
	payment: "payment",
	debit: "payment",
	outflow: "payment",
	deposit: "deposit",
	credit: "deposit",
	inflow: "deposit",
};

export type MappableField =
	| "date"
	| "notes"
	| "category"
	| "amount"
	| "payment"
	| "deposit"
	| "skip";

/**
 * Auto-map CSV headers to our transaction fields.
 */
export function autoMapColumns(headers: string[]): MappableField[] {
	return headers.map((h) => {
		const key = h.toLowerCase().trim();
		return (FIELD_ALIASES[key] as MappableField) ?? "skip";
	});
}

const DATE_PARSERS: Record<string, (value: string) => Date | null> = {
	"YYYY-MM-DD": (v) => {
		const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
		if (!m) return null;
		return new Date(+m[1], +m[2] - 1, +m[3]);
	},
	"DD/MM/YYYY": (v) => {
		const m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
		if (!m) return null;
		return new Date(+m[3], +m[2] - 1, +m[1]);
	},
	"MM/DD/YYYY": (v) => {
		const m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
		if (!m) return null;
		return new Date(+m[3], +m[1] - 1, +m[2]);
	},
};

export const DATE_FORMATS = Object.keys(DATE_PARSERS);

/**
 * Parse a date string using the specified format.
 */
export function parseDate(value: string, format: string): string {
	const parser = DATE_PARSERS[format];
	if (!parser) return new Date().toISOString();
	const date = parser(value.trim());
	if (!date || Number.isNaN(date.getTime())) return new Date().toISOString();
	return date.toISOString();
}

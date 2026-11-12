const MONTHS: Record<string, string> = {
	jan: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	may: "05",
	jun: "06",
	jul: "07",
	aug: "08",
	sep: "09",
	oct: "10",
	nov: "11",
	dec: "12",
};

// Transactions are stored at midday UTC so a date-only alert can never drift
// across a day boundary when rendered in a local timezone.
const atMidday = (year: string, month: string, day: string) =>
	`${year}-${month}-${day.padStart(2, "0")}T12:00:00.000Z`;

const DATE_PATTERNS: {
	pattern: RegExp;
	build: (m: RegExpMatchArray) => string | null;
}[] = [
	// 04-Sep-2026 / 04 Sep 2026 / 04-September-2026
	{
		pattern: /\b(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})\b/,
		build: (m) => {
			const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
			return month ? atMidday(m[3], month, m[1]) : null;
		},
	},
	// Sep 04, 2026 / September 4 2026
	{
		pattern: /\b([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})\b/,
		build: (m) => {
			const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
			return month ? atMidday(m[3], month, m[2]) : null;
		},
	},
	// 2026-09-04
	{
		pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/,
		build: (m) => atMidday(m[1], m[2], m[3]),
	},
	// 04/09/2026 - day-first, which is the convention in PK/UK/EU alerts.
	{
		pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
		build: (m) => {
			const day = Number(m[1]);
			const month = Number(m[2]);
			if (day > 31 || month > 12) return null;
			return atMidday(m[3], String(month).padStart(2, "0"), m[1]);
		},
	},
];

export function normalizeDate(raw: string | null | undefined): string | null {
	if (!raw) return null;
	for (const { pattern, build } of DATE_PATTERNS) {
		const match = raw.match(pattern);
		if (!match) continue;
		const iso = build(match);
		if (iso) return iso;
	}
	return null;
}

// Falls back to the email's own header date so an alert whose body omits a
// date still lands on the right day instead of being dropped entirely.
export function resolveDate(
	bodyDate: string | null,
	receivedAt: string | null | undefined,
): string | null {
	if (bodyDate) return bodyDate;
	if (!receivedAt) return null;
	const parsed = new Date(receivedAt);
	if (Number.isNaN(parsed.getTime())) return normalizeDate(receivedAt);
	return atMidday(
		String(parsed.getUTCFullYear()),
		String(parsed.getUTCMonth() + 1).padStart(2, "0"),
		String(parsed.getUTCDate()),
	);
}

const CURRENCY = String.raw`(?:PKR|RS\.?|INR|AED|SAR|USD|EUR|GBP|\$|₨|₹)`;
const NUMBER = String.raw`(\d[\d,]*(?:\.\d{1,2})?)`;

// "PKR 1,234.56", "Rs.1234", "$15.99", and the currency-last "1,250.00 PKR".
// Decimals are optional - not every bank sends them. A currency-last match
// must not be followed by another number, or "Ref 12345 PKR 1,000" would read
// the reference as the amount.
const AMOUNT_SOURCE = `${CURRENCY}\\s*${NUMBER}|${NUMBER}\\s*${CURRENCY}(?![A-Za-z]|\\s*\\d)`;
const AMOUNT_PATTERN = new RegExp(AMOUNT_SOURCE, "gi");

// Table-style alerts often print the figure with no currency at all
// ("Transaction Amount: 3,450.00").
const LABELED_AMOUNT = new RegExp(
	String.raw`\bAmount\s*[:-]+\s*${NUMBER}`,
	"gi",
);

export function extractAmountMatch(
	text: string,
): { amount: number; index: number } | null {
	for (const pattern of [AMOUNT_PATTERN, LABELED_AMOUNT]) {
		for (const match of text.matchAll(pattern)) {
			const amount = Number((match[1] ?? match[2]).replace(/,/g, ""));
			// Skip zero-value matches ("Fee: Rs.0") and keep looking - the real
			// transaction amount is usually the first non-zero figure.
			if (Number.isFinite(amount) && amount > 0) {
				return { amount, index: match.index ?? 0 };
			}
		}
	}
	return null;
}

export function extractAmount(text: string): number | null {
	return extractAmountMatch(text)?.amount ?? null;
}

const EXPENSE_WORDS =
	/\b(debited|debit|deducted|withdrawn|withdrawal|spent|paid|payment|sent|transferred|purchase|purchased|charged|used)\b/i;
const INCOME_WORDS =
	/\b(credited|credit|received|deposited|deposit|added|refund|refunded|remittance)\b/i;

// "credit card" and "debit card" name a card, not a direction: "your credit
// card was used for PKR 899" is a spend and "refunded to your debit card" is
// money coming back.
const CARD_NAMES = /\b(?:credit|debit)\s+card\b/gi;

export function detectDirection(text: string): "income" | "expense" | null {
	const words = text.replace(CARD_NAMES, "card");
	// Debit wording wins: "PKR 500 debited ... credited to beneficiary" is an
	// outgoing transfer described from both ends.
	if (EXPENSE_WORDS.test(words)) return "expense";
	if (INCOME_WORDS.test(words)) return "income";
	return null;
}

// How far from the amount a debit/credit word may sit and still be describing
// it. Real alerts put them in the same sentence ("PKR 640.00 sent from your
// account"); a newsletter quoting a salary range and using the word "paid"
// three paragraphs later is not a transaction.
const DIRECTION_PROXIMITY = 160;

/**
 * Direction word found near the amount. Far stricter than scanning the whole
 * body, which happily turns job alerts and newsletters into transactions.
 */
export function detectDirectionNear(
	text: string,
	amountIndex: number,
): "income" | "expense" | null {
	const window = text.slice(
		Math.max(0, amountIndex - DIRECTION_PROXIMITY),
		amountIndex + DIRECTION_PROXIMITY,
	);
	return detectDirection(window);
}

const WORD_BEFORE = /(\w+)\W*$/;
const WORD_AFTER = new RegExp(`^(?:${AMOUNT_SOURCE})\\W*(?<word>\\w+)`, "i");

/**
 * Direction word directly touching the amount ("sent Rs. 750", "Rs. 5,000
 * added"). Used for one-line subjects, where a looser window would let
 * "Rs. 500 off your first payment" through. "got" counts only here: "You got
 * Rs. 3,200 from X" is a receipt, but "you've got Rs. 500 cashback" in a body
 * is a promo.
 */
export function detectDirectionBeside(
	text: string,
	amountIndex: number,
): "income" | "expense" | null {
	const before = text.slice(0, amountIndex).match(WORD_BEFORE)?.[1] ?? "";
	const after = text.slice(amountIndex).match(WORD_AFTER)?.groups?.word ?? "";
	if (/^got$/i.test(before)) return "income";
	return detectDirection(`${before} ${after}`);
}

// A mail that names a positive amount with a direction word beside it is a
// transaction alert, even when the individual fields cannot be read. Used to
// tell a genuine parser gap apart from an ordinary non-transaction email.
export function looksLikeTransaction(text: string): boolean {
	const match = extractAmountMatch(text);
	if (!match) return false;
	return detectDirectionNear(text, match.index) !== null;
}

// Labels in these alerts run together on one line ("Merchant Name : X Branch :
// Y Transaction Date : Z"), so a capture must stop at whichever label is next.
export function buildFieldStop(labels: string[]): string {
	// The label must be followed by its colon to count as a stop. Without that
	// check a merchant genuinely called "MODE FASHION" or a terminal named
	// "CANTT BRANCH" would be truncated at the bare word.
	const alternatives = labels
		.map((label) => `\\s+${label}\\s*[:-]`)
		.concat("\\s+For\\s+Any\\s+Inquiry\\b", "$");
	return `(?=${alternatives.join("|")})`;
}

export function extractLabeledField(
	text: string,
	label: string,
	stop: string,
): string | null {
	// Labels appear as "Label :", "Label:" and sometimes "Label: :".
	const match = text.match(
		new RegExp(`${label}\\s*[:-]+\\s*(.+?)${stop}`, "i"),
	);
	return match?.[1]?.trim() || null;
}

// Normalize and clean a raw account/merchant string
export function formatAccountTitle(raw: string) {
	if (!raw) return "";
	let s = raw.replace(/\r?\n/g, " ").trim();
	// Strip leading/trailing separators left over from "Label: :" style labels
	s = s.replace(/^[:\s-]+/, "").replace(/[:\s-]+$/, "");
	// Drop long invoice/reference numbers (e.g. "1BILL INVOICES 100333027126")
	// that add no meaning to the description but bloat the row.
	s = s.replace(/\s+\d{8,}\b/g, "");
	// Remove service/rail tokens and masked account refs ("xxxBANK", "xxx1234"),
	// but only when the name has other words left - "MAIN BR" must not be
	// reduced to nothing. Turns "AHMED KHAN EASYPAISA-TELENOR-xxxBANK" into
	// "AHMED KHAN" while leaving "WALLET - Load Wallet" intact.
	const denoised = s
		.replace(/\b(EASYPAISA|TELENOR|IBFT|ACC|ACCOUNT|CNIC)\b/gi, "")
		.replace(/\bx{3,}\w*/gi, "")
		.trim();
	if (denoised.replace(/[\s-]+/g, "")) s = denoised;
	// Collapse separator runs left behind by the removals, then tidy the ends
	s = s
		.replace(/\s{2,}/g, " ")
		.replace(/\s*-{2,}\s*/g, " ")
		.replace(/^[:\s.-]+/, "")
		.replace(/[\s-]+$/, "")
		.trim();
	return s || "Bank Transaction";
}

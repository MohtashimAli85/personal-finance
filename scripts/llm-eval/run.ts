/**
 * Scores the regex parser and the on-device model against labelled emails.
 *   npx tsx scripts/llm-eval/run.ts                 mock corpus + fixtures
 *   npx tsx scripts/llm-eval/run.ts emails.json     stored emails, scored
 *                                                   against their cloud AI parse
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseBankEmail } from "../../lib/bank-parsers";
import { FIXTURES } from "../../lib/bank-parsers/fixtures";
import type {
	BankEmail,
	ParsedBankTransaction,
} from "../../lib/bank-parsers/types";
import { readWithLocalModel } from "../../lib/local-ai/extract";
import { fromModel, mergeLocalResult } from "../../lib/local-ai/merge";

interface Case {
	group: string;
	name: string;
	email: BankEmail;
	expected: ParsedBankTransaction | null;
}

const MODEL = path.resolve(
	process.env.LOCAL_MODEL ?? "models/Qwen3-0.6B-Q4_K_M.gguf",
);

const toEmail = (e: Partial<BankEmail> & { body: string }): BankEmail => ({
	from: e.from ?? null,
	subject: e.subject ?? null,
	receivedAt: e.receivedAt ?? null,
	body: e.body,
});

async function corpusCases(): Promise<Case[]> {
	const { CORPUS } = await import("./corpus");
	const all = [...CORPUS, ...FIXTURES.map((f) => ({ ...f, bank: "fixtures" }))];
	return all.map((f) => ({
		group: f.bank,
		name: f.name,
		email: toEmail(f.email),
		expected: f.expect.transaction
			? {
					amount: f.expect.amount,
					date: f.expect.date,
					type: f.expect.type,
					description: f.expect.description,
				}
			: null,
	}));
}

function storedCases(file: string): Case[] {
	const rows = JSON.parse(readFileSync(file, "utf8"));
	return rows
		.filter((r: { ai_parse: string | null }) => r.ai_parse)
		.map(
			(r: {
				id: string;
				from: string;
				subject: string;
				date: string;
				body_text: string;
				ai_parse: string;
			}) => ({
				group: r.from?.match(/@([\w.-]+)/)?.[1] ?? "unknown",
				name: r.id,
				email: {
					from: r.from,
					subject: r.subject,
					receivedAt: r.date,
					body: r.body_text ?? "",
				},
				expected: JSON.parse(r.ai_parse).transaction,
			}),
		);
}

const FIELDS = ["detect", "amount", "type", "date", "description"] as const;
type Field = (typeof FIELDS)[number];

function score(
	got: ParsedBankTransaction | null,
	want: ParsedBankTransaction | null,
): Record<Field, boolean | null> {
	const detect = Boolean(got) === Boolean(want);
	if (!want || !got) {
		return {
			detect,
			amount: null,
			type: null,
			date: null,
			description: null,
		};
	}
	return {
		detect,
		amount: got.amount === want.amount,
		type: got.type === want.type,
		date: got.date.slice(0, 10) === want.date.slice(0, 10),
		description:
			got.description.toLowerCase() === want.description.toLowerCase(),
	};
}

const READERS = ["regex", "model", "merged"] as const;

async function main() {
	const file = process.argv[2];
	const cases = file ? storedCases(file) : await corpusCases();
	const totals = Object.fromEntries(
		READERS.map((r) => [
			r,
			Object.fromEntries(FIELDS.map((f) => [f, { ok: 0, n: 0 }])),
		]),
	) as Record<string, Record<Field, { ok: number; n: number }>>;
	const failures: string[] = [];
	let modelMs = 0;

	for (const c of cases) {
		const started = performance.now();
		const raw = await readWithLocalModel(c.email, MODEL);
		modelMs += performance.now() - started;

		const results = {
			regex: parseBankEmail(c.email).transaction,
			model: fromModel(c.email, raw),
			merged: mergeLocalResult(c.email, raw),
		};

		for (const reader of READERS) {
			const s = score(results[reader], c.expected);
			for (const field of FIELDS) {
				if (s[field] === null) continue;
				totals[reader][field].n += 1;
				if (s[field]) totals[reader][field].ok += 1;
			}
		}

		const merged = score(results.merged, c.expected);
		const wrong = FIELDS.filter((f) => merged[f] === false);
		if (wrong.length) {
			failures.push(
				`[${c.group}] ${c.name}: ${wrong.join(", ")}\n` +
					`    want  ${JSON.stringify(c.expected)}\n` +
					`    got   ${JSON.stringify(results.merged)}\n` +
					`    model ${JSON.stringify(raw)}`,
			);
		}
	}

	const pct = ({ ok, n }: { ok: number; n: number }) =>
		n ? `${((ok / n) * 100).toFixed(0)}% (${ok}/${n})` : "-";
	console.table(
		Object.fromEntries(
			READERS.map((r) => [
				r,
				Object.fromEntries(FIELDS.map((f) => [f, pct(totals[r][f])])),
			]),
		),
	);
	console.log(
		`${cases.length} emails, model ${(modelMs / cases.length).toFixed(0)} ms/email`,
	);
	console.log(`\nMerged failures (${failures.length}):\n`);
	console.log(failures.join("\n\n"));
	process.exit(0);
}

main();

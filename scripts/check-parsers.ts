/**
 * Parser regression check (CLI runner). Run with: npx tsx scripts/check-parsers.ts
 * Fixtures live in lib/bank-parsers/fixtures.ts, shared with the vitest suite
 * (test/bank-parsers.test.ts) that runs in CI.
 */
import { parseBankEmail } from "../lib/bank-parsers";
import { FIXTURES } from "../lib/bank-parsers/fixtures";

let failed = 0;
for (const fixture of FIXTURES) {
	const outcome = parseBankEmail({
		from: fixture.email.from ?? null,
		subject: fixture.email.subject ?? null,
		receivedAt: fixture.email.receivedAt ?? null,
		body: fixture.email.body,
	});

	const problems: string[] = [];
	if (fixture.expect.transaction) {
		const tx = outcome.transaction;
		if (!tx) {
			problems.push(`expected a transaction, got none (${outcome.failure})`);
		} else {
			if (tx.amount !== fixture.expect.amount)
				problems.push(`amount ${tx.amount} != ${fixture.expect.amount}`);
			if (tx.date !== fixture.expect.date)
				problems.push(`date ${tx.date} != ${fixture.expect.date}`);
			if (tx.type !== fixture.expect.type)
				problems.push(`type ${tx.type} != ${fixture.expect.type}`);
			if (tx.description !== fixture.expect.description)
				problems.push(
					`description "${tx.description}" != "${fixture.expect.description}"`,
				);
		}
	} else {
		if (outcome.transaction) {
			problems.push(
				`expected no transaction, got ${JSON.stringify(outcome.transaction)}`,
			);
		}
		if (fixture.expect.failure && outcome.failure !== fixture.expect.failure) {
			problems.push(
				`failure "${outcome.failure}" != "${fixture.expect.failure}"`,
			);
		}
	}

	if (problems.length === 0) {
		console.log(`  PASS  ${fixture.name}`);
	} else {
		failed += 1;
		console.log(`  FAIL  ${fixture.name}`);
		for (const problem of problems) console.log(`          ${problem}`);
	}
}

console.log(`\n${FIXTURES.length - failed}/${FIXTURES.length} passed`);
process.exit(failed > 0 ? 1 : 0);

import { describe, expect, it } from "vitest";
import { parseBankEmail } from "@/lib/bank-parsers";
import { FIXTURES } from "@/lib/bank-parsers/fixtures";

describe("bank email parsers", () => {
	for (const fixture of FIXTURES) {
		it(fixture.name, () => {
			const outcome = parseBankEmail({
				from: fixture.email.from ?? null,
				subject: fixture.email.subject ?? null,
				receivedAt: fixture.email.receivedAt ?? null,
				body: fixture.email.body,
			});

			if (fixture.expect.transaction) {
				expect(outcome.transaction).not.toBeNull();
				expect(outcome.transaction?.amount).toBe(fixture.expect.amount);
				expect(outcome.transaction?.date).toBe(fixture.expect.date);
				expect(outcome.transaction?.type).toBe(fixture.expect.type);
				expect(outcome.transaction?.description).toBe(
					fixture.expect.description,
				);
			} else {
				expect(outcome.transaction).toBeNull();
				if (fixture.expect.failure) {
					expect(outcome.failure).toBe(fixture.expect.failure);
				}
			}
		});
	}
});

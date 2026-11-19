import { describe, expect, it } from "vitest";
import type { BankEmail } from "@/lib/bank-parsers/types";
import { type LocalAnswer, mergeLocalResult } from "@/lib/local-ai/merge";

const email = (body: string, subject: string | null = null): BankEmail => ({
	from: "Meezan Bank <alerts@meezan.example>",
	subject,
	receivedAt: "Sun, 15 Nov 2026 20:11:30 +0500",
	body,
});

const card = email(
	"Dear Customer, PKR 3,010.00 is Debited from your account xxx1234 with the following details: Mode : for card used Merchant Name : GINZA MART JHEL Branch : MAIN BR Transaction Date : 11-Oct-2026",
);

const answer = (overrides: Partial<LocalAnswer>): LocalAnswer => ({
	amount: 3010,
	type: "expense",
	counterparty: null,
	isTransaction: true,
	...overrides,
});

describe("mergeLocalResult", () => {
	it("keeps regex figures and takes a name copied from the mail", () => {
		expect(
			mergeLocalResult(card, answer({ counterparty: "GINZA MART" })),
		).toEqual({
			amount: 3010,
			date: "2026-10-11T12:00:00.000Z",
			type: "expense",
			description: "GINZA MART",
		});
	});

	it.each([
		["an invented name", "Ginza Supermarket"],
		["the sender", "Meezan Bank"],
		["a masked account", "xxx1234"],
	])("ignores %s", (_, counterparty) => {
		expect(mergeLocalResult(card, answer({ counterparty }))?.description).toBe(
			"GINZA MART JHEL",
		);
	});

	it("builds the whole row when the regex parser cannot read the mail", () => {
		const unusual = email(
			"Hi! Rs 2,500.00 landed in your wallet from Sara Malik on 15/11/2026.",
		);
		expect(
			mergeLocalResult(
				unusual,
				answer({ amount: 2500, type: "income", counterparty: "Sara Malik" }),
			),
		).toEqual({
			amount: 2500,
			date: "2026-11-15T12:00:00.000Z",
			type: "income",
			description: "Sara Malik",
		});
	});

	it("drops an amount that is not in the mail", () => {
		const unusual = email("Hi! Rs 2,500.00 landed in your wallet.");
		expect(mergeLocalResult(unusual, answer({ amount: 25 }))).toBeNull();
	});

	it("never imports a notice the model mistook for a transaction", () => {
		const declined = email(
			"Your payment of Rs. 3,200 at DARAZ was declined because of insufficient balance.",
			"Payment declined",
		);
		expect(
			mergeLocalResult(
				declined,
				answer({ amount: 3200, counterparty: "DARAZ" }),
			),
		).toBeNull();
	});
});

/**
 * Parser regression check. Run with: npx tsx scripts/check-parsers.ts
 *
 * Each fixture is a real-world alert shape. Add one whenever a bank is added
 * or a format changes - banks reword these mails without warning, and this is
 * what catches it before transactions start going missing.
 */
import { parseBankEmail } from "../lib/bank-parsers";
import type { BankEmail } from "../lib/bank-parsers/types";

interface Fixture {
	name: string;
	email: Partial<BankEmail> & { body: string };
	expect:
		| { transaction: false; failure?: "not-a-transaction" | "unrecognized-format" }
		| {
				transaction: true;
				amount: number;
				date: string;
				type: "income" | "expense";
				description: string;
		  };
}

const meezan = (body: string) => ({
	from: "Meezan Bank Alert <no-reply@meezanbank.com>",
	body,
});

const FIXTURES: Fixture[] = [
	{
		name: "meezan: RAAST transfer out",
		email: meezan(
			"Dear Customer, PKR 640.00 sent from your account xxx0417 with the following details: Beneficiary Account Title: : J.SPORTS Branch : JHELUM BR JLM Transaction Date : 13-Sep-2026 Transaction Time : 17:47",
		),
		expect: {
			transaction: true,
			amount: 640,
			date: "2026-09-13T12:00:00.000Z",
			type: "expense",
			description: "J.SPORTS",
		},
	},
	{
		name: "meezan: card purchase (merchant name must not swallow later labels)",
		email: meezan(
			"Dear Customer, PKR 4,957.00 is Debited from your account xxx0417 with the following details: Mode : for card used Merchant Name : SHAN SUPER MARK Branch : JHELUM BR JLM Transaction Date : 13-Sep-2026 Transaction Time : 17:25",
		),
		expect: {
			transaction: true,
			amount: 4957,
			date: "2026-09-13T12:00:00.000Z",
			type: "expense",
			description: "SHAN SUPER MARK",
		},
	},
	{
		name: "meezan: ATM withdrawal falls back to terminal name",
		email: meezan(
			"Dear Customer, PKR 20,000.00 is Debited from your account xxx0417 with the following details: Mode : VISA ATM CW Terminal Name : CHAK KHASA BRANCH Branch : JHELUM BR JLM Transaction Date : 04-Sep-2026 Transaction Time : 08:32",
		),
		expect: {
			transaction: true,
			amount: 20000,
			date: "2026-09-04T12:00:00.000Z",
			type: "expense",
			description: "CHAK KHASA BRANCH",
		},
	},
	{
		name: "meezan: bill payment falls back to mode",
		email: meezan(
			"Dear Customer, PKR 3,055.00 is Debited from your account xxx0417 with the following details: Mode : 1BILL INVOICES 10033302712625200429 Branch : JHELUM BR JLM Transaction Date : 09-Sep-2026 Transaction Time : 14:50",
		),
		expect: {
			transaction: true,
			amount: 3055,
			date: "2026-09-09T12:00:00.000Z",
			type: "expense",
			description: "1BILL INVOICES",
		},
	},
	{
		name: "meezan: beneficiary with wallet suffixes",
		email: meezan(
			"Dear Customer, PKR 3,200.00 sent from your account xxx0417 with the following details: Beneficiary Account : FAISAL MATEEN EASYPAISA-TELENOR-xxxBANK Branch : JHELUM BR JLM Transaction Date : 12-Sep-2026 Transaction Time : 11:15 Fee: Fee: Rs.0",
		),
		expect: {
			transaction: true,
			amount: 3200,
			date: "2026-09-12T12:00:00.000Z",
			type: "expense",
			description: "FAISAL MATEEN",
		},
	},
	{
		name: "meezan: login alert is not a transaction",
		email: meezan(
			"Dear Customer, You have successfully logged on to Meezan bank Mobile App at 13/09/2026 05:46 PM. If you do not recognize this login attempt, please immediately call our 24/7 helpline.",
		),
		expect: { transaction: false, failure: "not-a-transaction" },
	},
	{
		name: "meezan: marketing mail is not a transaction",
		email: meezan(
			"Dear Customer, Assalam o Alaikum! Haven't used your Meezan Debit Card internationally since September 2025? Enjoy 0% Foreign Transaction Fee. Offer valid till September 30, 2026.",
		),
		expect: { transaction: false, failure: "not-a-transaction" },
	},
	{
		name: "zero-amount receipt must never import",
		email: {
			from: "<e.statement@telenorbank.pk>",
			subject: "Easypaisa Money Transfer Receipt",
			body: "Your transfer receipt. Amount Rs.0.00 Fee Rs.0.00 Date 07-Sep-2026",
		},
		expect: { transaction: false },
	},
	{
		name: "generic bank: labelled debit alert from an unknown sender",
		email: {
			from: "HBL Alerts <alerts@hbl.com>",
			body: "Dear Customer, your account has been debited with PKR 1,250.00. Merchant Name: CARREFOUR MALL Transaction Date: 10-Sep-2026 Available Balance: PKR 45,000.00",
		},
		expect: {
			transaction: true,
			amount: 1250,
			date: "2026-09-10T12:00:00.000Z",
			type: "expense",
			description: "CARREFOUR MALL",
		},
	},
	{
		name: "generic bank: credit with slash date",
		email: {
			from: "UBL <noreply@ubl.com.pk>",
			body: "Your account has been credited with Rs. 85,000.00 on 05/09/2026. Narration: SALARY SEPTEMBER",
		},
		expect: {
			transaction: true,
			amount: 85000,
			date: "2026-09-05T12:00:00.000Z",
			type: "income",
			description: "SALARY SEPTEMBER",
		},
	},
	{
		name: "generic bank: no body date falls back to the email header date",
		email: {
			from: "Bank <alerts@examplebank.com>",
			body: "You spent USD 15.99 at NETFLIX.COM using your card ending 1234.",
			receivedAt: "Sat, 12 Sep 2026 11:16:35 +0500",
		},
		expect: {
			transaction: true,
			amount: 15.99,
			date: "2026-09-12T12:00:00.000Z",
			type: "expense",
			description: "NETFLIX.COM",
		},
	},
	{
		name: "OTP mail quoting an amount is not imported (no direction word)",
		email: {
			from: "Bank <alerts@examplebank.com>",
			body: "Your OTP is 493021 for a transaction of PKR 5,000.00. Do not share it with anyone.",
		},
		expect: { transaction: false, failure: "not-a-transaction" },
	},
];

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

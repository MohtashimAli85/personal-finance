/**
 * Bank email parser regression fixtures. Each one is a real-world alert
 * shape with the personal details replaced - add one whenever a new format
 * turns up, since banks reword these mails without warning and this is what
 * catches it before transactions start going missing.
 *
 * Consumed by test/bank-parsers.test.ts (vitest / CI) and by
 * scripts/check-parsers.ts (a quick CLI runner with readable pass/fail output).
 */
import type { BankEmail } from "./types";

export interface Fixture {
	name: string;
	email: Partial<BankEmail> & { body: string };
	expect:
		| {
				transaction: false;
				failure?: "not-a-transaction" | "unrecognized-format";
		  }
		| {
				transaction: true;
				amount: number;
				date: string;
				type: "income" | "expense";
				description: string;
		  };
}

const bank = (body: string) => ({
	from: "Bank Alerts <alerts@examplebank.com>",
	body,
});

const wallet = (subject: string) => ({
	from: "Wallet <service@examplewallet.com>",
	subject,
	receivedAt: "Fri, 16 Oct 2026 19:36:24 +0500 (PKT)",
	body: "",
});

export const FIXTURES: Fixture[] = [
	{
		name: "wallet subject: top-up from a bank account",
		email: wallet("Rs. 5,000 added from Bank-1234! 🎉"),
		expect: {
			transaction: true,
			amount: 5000,
			date: "2026-10-16T12:00:00.000Z",
			type: "income",
			description: "Bank-1234",
		},
	},
	{
		name: "wallet subject: money sent",
		email: wallet("You sent Rs. 750 to Ahmed Khan 💸"),
		expect: {
			transaction: true,
			amount: 750,
			date: "2026-10-16T12:00:00.000Z",
			type: "expense",
			description: "Ahmed Khan",
		},
	},
	{
		name: "wallet subject: money received",
		email: wallet("You got Rs. 3,200 from Sara Malik 🎉"),
		expect: {
			transaction: true,
			amount: 3200,
			date: "2026-10-16T12:00:00.000Z",
			type: "income",
			description: "Sara Malik",
		},
	},
	{
		name: "wallet subject: card spend",
		email: wallet("You spent Rs. 1,200 at Foodpanda"),
		expect: {
			transaction: true,
			amount: 1200,
			date: "2026-10-16T12:00:00.000Z",
			type: "expense",
			description: "Foodpanda",
		},
	},
	{
		name: "wallet subject: promo quoting an amount is not a transaction",
		email: wallet("Get Rs. 500 off your first payment at Foodpanda"),
		expect: { transaction: false },
	},
	{
		name: "bank: instant transfer out",
		email: bank(
			"Dear Customer, PKR 640.00 sent from your account xxx1234 with the following details: Beneficiary Account Title: : K.SPORTS Branch : MAIN BR Transaction Date : 13-Sep-2026 Transaction Time : 17:47",
		),
		expect: {
			transaction: true,
			amount: 640,
			date: "2026-09-13T12:00:00.000Z",
			type: "expense",
			description: "K.SPORTS",
		},
	},
	{
		name: "bank: card purchase (merchant name must not swallow later labels)",
		email: bank(
			"Dear Customer, PKR 4,957.00 is Debited from your account xxx1234 with the following details: Mode : for card used Merchant Name : CITY SUPER MART Branch : MAIN BR Transaction Date : 13-Sep-2026 Transaction Time : 17:25",
		),
		expect: {
			transaction: true,
			amount: 4957,
			date: "2026-09-13T12:00:00.000Z",
			type: "expense",
			description: "CITY SUPER MART",
		},
	},
	{
		name: "bank: ATM withdrawal falls back to terminal name",
		email: bank(
			"Dear Customer, PKR 20,000.00 is Debited from your account xxx1234 with the following details: Mode : VISA ATM CW Terminal Name : CANTT BRANCH Branch : MAIN BR Transaction Date : 04-Sep-2026 Transaction Time : 08:32",
		),
		expect: {
			transaction: true,
			amount: 20000,
			date: "2026-09-04T12:00:00.000Z",
			type: "expense",
			description: "CANTT BRANCH",
		},
	},
	{
		name: "bank: bill payment falls back to mode",
		email: bank(
			"Dear Customer, PKR 3,055.00 is Debited from your account xxx1234 with the following details: Mode : 1BILL INVOICES 10000000000000000001 Branch : MAIN BR Transaction Date : 09-Sep-2026 Transaction Time : 14:50",
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
		name: "bank: beneficiary with wallet suffixes",
		email: bank(
			"Dear Customer, PKR 3,200.00 sent from your account xxx1234 with the following details: Beneficiary Account : SARA MALIK EASYPAISA-TELENOR-xxxBANK Branch : MAIN BR Transaction Date : 12-Sep-2026 Transaction Time : 11:15 Fee: Fee: Rs.0",
		),
		expect: {
			transaction: true,
			amount: 3200,
			date: "2026-09-12T12:00:00.000Z",
			type: "expense",
			description: "SARA MALIK",
		},
	},
	{
		name: "bank: login alert is not a transaction",
		email: bank(
			"Dear Customer, You have successfully logged on to the Mobile App at 13/09/2026 05:46 PM. If you do not recognize this login attempt, please immediately call our 24/7 helpline.",
		),
		expect: { transaction: false, failure: "not-a-transaction" },
	},
	{
		name: "bank: marketing mail is not a transaction",
		email: bank(
			"Dear Customer, Assalam o Alaikum! Haven't used your Debit Card internationally since September 2025? Enjoy 0% Foreign Transaction Fee. Offer valid till September 30, 2026.",
		),
		expect: { transaction: false, failure: "not-a-transaction" },
	},
	{
		name: "bank: labelled debit alert",
		email: bank(
			"Dear Customer, your account has been debited with PKR 1,250.00. Merchant Name: CARREFOUR MALL Transaction Date: 10-Sep-2026 Available Balance: PKR 45,000.00",
		),
		expect: {
			transaction: true,
			amount: 1250,
			date: "2026-09-10T12:00:00.000Z",
			type: "expense",
			description: "CARREFOUR MALL",
		},
	},
	{
		name: "bank: credit with slash date",
		email: bank(
			"Your account has been credited with Rs. 85,000.00 on 05/09/2026. Narration: SALARY SEPTEMBER",
		),
		expect: {
			transaction: true,
			amount: 85000,
			date: "2026-09-05T12:00:00.000Z",
			type: "income",
			description: "SALARY SEPTEMBER",
		},
	},
	{
		name: "bank: no body date falls back to the email header date",
		email: {
			...bank(
				"You spent USD 15.99 at NETFLIX.COM using your card ending 1234.",
			),
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
		name: "bank: currency written after the amount",
		email: bank(
			"Dear Customer, 2,500.00 PKR has been deducted from your account xxx1234 at CITY PHARMACY on 15-Oct-2026.",
		),
		expect: {
			transaction: true,
			amount: 2500,
			date: "2026-10-15T12:00:00.000Z",
			type: "expense",
			description: "CITY PHARMACY",
		},
	},
	{
		name: "bank: reference number before the amount is not the amount",
		email: bank(
			"Funds transfer Ref 12345 PKR 1,000.00 debited from your account xxx1234 on 18-Oct-2026. Beneficiary Name: AHMED KHAN",
		),
		expect: {
			transaction: true,
			amount: 1000,
			date: "2026-10-18T12:00:00.000Z",
			type: "expense",
			description: "AHMED KHAN",
		},
	},
	{
		name: "bank: table-style alert with no currency on the amount",
		email: bank(
			"Transaction Alert Account: xxx1234 Transaction Type: Debit Amount: 3,450.00 Merchant: FOODPANDA Date: 20-Oct-2026",
		),
		expect: {
			transaction: true,
			amount: 3450,
			date: "2026-10-20T12:00:00.000Z",
			type: "expense",
			description: "FOODPANDA",
		},
	},
	{
		name: "bank: credit card spend is an expense, not income",
		email: bank(
			"Your credit card ending 1234 was used for PKR 899.00 at DARAZ.PK on 21 Oct 2026.",
		),
		expect: {
			transaction: true,
			amount: 899,
			date: "2026-10-21T12:00:00.000Z",
			type: "expense",
			description: "DARAZ.PK",
		},
	},
	{
		name: "bank: refund to a debit card is income",
		email: bank(
			"PKR 1,500.00 has been refunded to your debit card ending 1234 by DARAZ.PK on 22-Oct-2026.",
		),
		expect: {
			transaction: true,
			amount: 1500,
			date: "2026-10-22T12:00:00.000Z",
			type: "income",
			description: "DARAZ.PK",
		},
	},
	{
		name: "zero-amount receipt must never import",
		email: {
			from: "<receipts@examplewallet.com>",
			subject: "Money Transfer Receipt",
			body: "Your transfer receipt. Amount Rs.0.00 Fee Rs.0.00 Date 07-Sep-2026",
		},
		expect: { transaction: false },
	},
	{
		name: "OTP mail quoting an amount is not imported (no direction word)",
		email: bank(
			"Your OTP is 493021 for a transaction of PKR 5,000.00. Do not share it with anyone.",
		),
		expect: { transaction: false, failure: "not-a-transaction" },
	},
];

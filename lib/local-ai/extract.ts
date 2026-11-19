import { emailPrompt } from "@/lib/bank-parsers/ai";
import type {
	BankEmail,
	ParsedBankTransaction,
} from "@/lib/bank-parsers/types";
import { type LocalAnswer, mergeLocalResult } from "./merge";

const nullable = <const T extends object>(schema: T) =>
	({ oneOf: [schema, { type: "null" }] }) as const;

// Key order is generation order: the small model reads the figures before it
// decides whether the mail is a transaction at all. Dates come from the regex
// layer, which reads them far more reliably than a 0.6B model.
const JSON_SCHEMA = {
	type: "object",
	properties: {
		amount: nullable({ type: "number" }),
		type: { enum: ["income", "expense", null] },
		counterparty: nullable({ type: "string", maxLength: 50 }),
		isTransaction: { type: "boolean" },
	},
} as const;

const INSTRUCTIONS = `Read a bank or wallet alert and reply with JSON.
- amount: the transaction amount as a number (Rs 1,250.50 -> 1250.5).
- type: "expense" if money left the account, "income" if money came in.
- counterparty: only the short merchant, shop, person or company name, copied exactly. No account numbers, branch, city, IBAN or words like RAAST, IBFT, ATM, POS.
- isTransaction: false for OTPs, login alerts, promotions, statements and declined payments.

Example: "PKR 1,570.00 debited from your account for card used Merchant Name : DR SAUCY Branch : MAIN BR"
{"amount":1570,"type":"expense","counterparty":"DR SAUCY","isTransaction":true}

Example: "You have received Rs 7,000 from M.Ibtehaj AC# RAAST PYMT PK97XXXX Branch : CITY BR"
{"amount":7000,"type":"income","counterparty":"M.Ibtehaj","isTransaction":true}

Example: "Your OTP for a payment of Rs 5,000 is 493021. Do not share it."
{"amount":5000,"type":null,"counterparty":null,"isTransaction":false}`;

const TIMEOUT_MS = 60_000;

async function loadSession(modelPath: string) {
	const { getLlama, LlamaChatSession, QwenChatWrapper } = await import(
		"node-llama-cpp"
	);
	const llama = await getLlama({ build: "never" });
	const model = await llama.loadModel({ modelPath });
	const context = await model.createContext({ contextSize: 4096 });
	const session = new LlamaChatSession({
		contextSequence: context.getSequence(),
		systemPrompt: INSTRUCTIONS,
		chatWrapper: new QwenChatWrapper({ thoughts: "discourage" }),
	});
	const grammar = await llama.createGrammarForJsonSchema(JSON_SCHEMA);
	return { model, session, grammar };
}

let loaded: { path: string; ready: ReturnType<typeof loadSession> } | null =
	null;

// Switching models frees the old one instead of keeping both in memory.
function sessionFor(modelPath: string) {
	if (loaded?.path !== modelPath) {
		void loaded?.ready.then(({ model }) => model.dispose()).catch(() => {});
		loaded = { path: modelPath, ready: loadSession(modelPath) };
	}
	return loaded.ready;
}
let queue: Promise<unknown> = Promise.resolve();

export function readWithLocalModel(
	email: BankEmail,
	modelPath: string,
): Promise<LocalAnswer> {
	const ready = sessionFor(modelPath);
	// One context sequence, so emails are read one at a time.
	const run = queue.then(async () => {
		const { session, grammar } = await ready;
		session.resetChatHistory();
		const answer = await session.prompt(emailPrompt(email), {
			grammar,
			temperature: 0,
			maxTokens: 200,
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		return grammar.parse(answer);
	});
	queue = run.catch(() => {});
	return run;
}

export async function extractWithLocalModel(
	email: BankEmail,
	modelPath: string,
): Promise<ParsedBankTransaction | null> {
	return mergeLocalResult(email, await readWithLocalModel(email, modelPath));
}

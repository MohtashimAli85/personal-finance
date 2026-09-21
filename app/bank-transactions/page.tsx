import type { Metadata } from "next";
import { listUnparsedBankEmailsAction } from "@/app/actions/bank/sender-config";
import { getBankTransactions } from "@/lib/bank-transaction";
import { getBankSenderConfigs } from "@/lib/mail/bank-sender-config";
import { getMailStatus } from "@/lib/mail/credentials";
import BankTransactionsClient from "./bank-transactions-client";

export const metadata: Metadata = {
	title: "Bank Transactions - Personal Finance",
	description: "Import transactions from your bank email alerts",
};

export default async function BankTransactionsPage() {
	const mailStatus = await getMailStatus();
	const transactions = getBankTransactions();
	const senderConfigs = getBankSenderConfigs();
	const unparsed = await listUnparsedBankEmailsAction();

	return (
		<BankTransactionsClient
			transactions={transactions}
			configured={mailStatus.configured}
			email={mailStatus.email}
			senderConfigs={senderConfigs}
			unparsed={unparsed}
		/>
	);
}

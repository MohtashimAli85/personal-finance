import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TransactionRegister from "@/components/transactions/transaction-register";
import { getAccountById } from "@/lib/account";

export async function generateMetadata(props: PageIdProps): Promise<Metadata> {
	const { accountId } = await props.params;
	return { title: getAccountById(accountId)?.name ?? "Account" };
}

export default async function Page(props: PageIdProps) {
	const { accountId } = await props.params;
	const searchParams = await props.searchParams;
	const account = getAccountById(accountId);
	if (!account || account.closed_at) notFound();

	return (
		<TransactionRegister
			title={account.name}
			description={
				account.account_type === "off_budget"
					? "Off-budget account"
					: "Budget account"
			}
			balance={account.balance}
			accountId={accountId}
			searchParams={searchParams}
			draft={{
				accountId,
				autoInitialize: Boolean(searchParams.new),
			}}
		/>
	);
}

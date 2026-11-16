import { getAccounts } from "@/lib/account";
import { Money } from "../money";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "../ui/sidebar";
import { AccountItem } from "./account-item";

const sumBalances = (accounts: Account[]) =>
	accounts.reduce((sum, a) => sum + a.balance, 0);

const AccountGroup = ({
	label,
	accounts,
}: {
	label: string;
	accounts: Account[];
}) => (
	<SidebarGroup>
		<SidebarGroupLabel className="justify-between">
			{label}
			<Money value={sumBalances(accounts)} />
		</SidebarGroupLabel>
		<SidebarMenu>
			{accounts.map((account) => (
				<AccountItem key={account.id} account={account} />
			))}
		</SidebarMenu>
	</SidebarGroup>
);

export default function AccountsList() {
	const accounts = getAccounts();
	const onBudget = accounts.filter((a) => a.account_type === "on_budget");
	const offBudget = accounts.filter((a) => a.account_type === "off_budget");

	return (
		<>
			{onBudget.length > 0 && (
				<AccountGroup label="Budget accounts" accounts={onBudget} />
			)}
			{offBudget.length > 0 && (
				<AccountGroup label="Off-budget accounts" accounts={offBudget} />
			)}
		</>
	);
}

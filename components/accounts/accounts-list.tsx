import { formatCurrency } from "@/lib/helper";
import { fetchAccounts } from "@/lib/services";
import NavItem from "../sidebar/nav-item";
import { SidebarMenuBadge, SidebarMenuItem } from "../ui/sidebar";
import { AccountItem } from "./account-item";

const AccountList = async () => {
	const accounts = await fetchAccounts();
	const totalBalance = accounts.reduce(
		(sum, account) => sum + account.balance,
		0,
	);
	return (
		<>
			<SidebarMenuItem>
				<NavItem href="/transactions">All Accounts</NavItem>
				<SidebarMenuBadge>{formatCurrency(totalBalance)}</SidebarMenuBadge>
			</SidebarMenuItem>
			{accounts.map((account) => (
				<AccountItem key={account.id} account={account} />
			))}
		</>
	);
};

export default AccountList;

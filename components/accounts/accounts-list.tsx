import { getAllAccountBalance, getAllAccounts } from "@/app/actions/account";
import { formatCurrency } from "@/lib/helper";
import NavItem from "../sidebar/nav-item";
import { SidebarMenuBadge, SidebarMenuItem } from "../ui/sidebar";

const AccountList = async () => {
  const accounts = await getAllAccounts();
  return (
    <>
      <AllAccounts />
      {accounts.map((account) => (
        <SidebarMenuItem key={account.id}>
          <NavItem href={`/transactions?account=${account.id}`}>
            {account.name}
            <SidebarMenuBadge>
              {formatCurrency(account.balance)}
            </SidebarMenuBadge>
          </NavItem>
        </SidebarMenuItem>
      ))}
    </>
  );
};

const AllAccounts = async () => {
  const totalBalance = await getAllAccountBalance();
  return (
    <SidebarMenuItem>
      <NavItem href="/transactions">All Accounts</NavItem>
      <SidebarMenuBadge>{formatCurrency(totalBalance)}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
};

export default AccountList;

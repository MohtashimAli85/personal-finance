import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { getAccounts } from "@/lib/account";
import { AccountItem } from "./account-item";

const AccountList = () => {
  const accounts = getAccounts();
  const onBudget = accounts.filter((a) => a.account_type === "on_budget");
  const offBudget = accounts.filter((a) => a.account_type === "off_budget");

  return (
    <>
      <SidebarGroupLabel>On Budget</SidebarGroupLabel>
      {onBudget.map((account) => (
        <AccountItem key={account.id} account={account} />
      ))}
      {offBudget.length > 0 && (
        <>
          <SidebarGroupLabel>Off Budget</SidebarGroupLabel>
          {offBudget.map((account) => (
            <AccountItem key={account.id} account={account} />
          ))}
        </>
      )}
    </>
  );
};

export default AccountList;

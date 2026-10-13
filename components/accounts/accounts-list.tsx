import Link from "next/link";
import { getAccounts } from "@/lib/account";
import { cn } from "@/lib/tailwindcss/utils";
import { Money } from "../money";
import { AccountItem } from "./account-item";

const sumBalances = (accounts: Account[]) =>
  accounts.reduce((sum, a) => sum + a.balance, 0);

const AccountsHeader = ({
  label,
  total,
  underline,
  href,
}: {
  label: string;
  total: number;
  underline?: boolean;
  href?: string;
}) => {
  const rowClass = cn(
    "flex items-center justify-between py-1.5",
    href &&
      "rounded-md px-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
  const content = (
    <>
      <span>{label}</span>
      <Money value={total} className="tabular-nums" />
    </>
  );

  return (
    <li
      className={cn(
        "mt-3 text-sm font-semibold first:mt-0",
        !href && "mx-2",
        underline && "mb-1 border-b border-sidebar-foreground/40",
      )}
    >
      {href ? (
        <Link href={href} className={rowClass}>
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
};

const AccountList = () => {
  const accounts = getAccounts();
  const onBudget = accounts.filter((a) => a.account_type === "on_budget");
  const offBudget = accounts.filter((a) => a.account_type === "off_budget");

  return (
    <>
      <AccountsHeader
        label="All accounts"
        total={sumBalances(accounts)}
        href="/transactions"
      />
      <AccountsHeader
        label="On budget"
        total={sumBalances(onBudget)}
        underline
      />
      {onBudget.map((account) => (
        <AccountItem key={account.id} account={account} />
      ))}
      {offBudget.length > 0 && (
        <>
          <AccountsHeader
            label="Off budget"
            total={sumBalances(offBudget)}
            underline
          />
          {offBudget.map((account) => (
            <AccountItem key={account.id} account={account} />
          ))}
        </>
      )}
    </>
  );
};

export default AccountList;

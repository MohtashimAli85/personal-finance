"use client";
import { updateAccount } from "@/app/actions/accounts/mutations";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { formatCurrency } from "@/lib/helper";
import NavItem from "../sidebar/nav-item";
import { Dialog } from "../ui/dialog";
import { SidebarMenuBadge, SidebarMenuItem } from "../ui/sidebar";
import AccountContextMenu from "./account-context-menu";
import CloseAccount from "./close-account";

export const AccountItem = ({ account }: { account: Account }) => {
  const { containerRef, startEditing, handleBlur, handleKeyDown } =
    useInlineEdit((value) => {
      updateAccount(account.id, value);
    });

  return (
    <Dialog>
      <AccountContextMenu onRename={startEditing}>
        <SidebarMenuItem>
          <NavItem href={`/transactions/${account.id}`}>
            <div className="grow max-w-30" ref={containerRef}>
              <input
                data-edit
                key={account.name}
                hidden
                id={"name"}
                defaultValue={account.name}
                className="outline-none"
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
              <span data-view>{account.name}</span>
            </div>
            <SidebarMenuBadge>
              {formatCurrency(account.balance)}
            </SidebarMenuBadge>
          </NavItem>
        </SidebarMenuItem>
      </AccountContextMenu>
      <CloseAccount account={account} />
    </Dialog>
  );
};

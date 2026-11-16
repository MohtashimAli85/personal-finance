"use client";
import { renameAccount } from "@/app/actions/accounts/mutations";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { toastOnError } from "@/lib/action-result";
import { Money } from "../money";
import NavItem from "../sidebar/nav-item";
import { Dialog } from "../ui/dialog";
import { SidebarMenuItem } from "../ui/sidebar";
import AccountActionsMenu from "./account-actions-menu";
import AccountContextMenu from "./account-context-menu";
import CloseAccount from "./close-account";

export const AccountItem = ({ account }: { account: Account }) => {
	const { containerRef, startEditing, handleBlur, handleKeyDown } =
		useInlineEdit((value) => {
			toastOnError(renameAccount({ id: account.id, name: value }));
		});

	return (
		<Dialog>
			<AccountContextMenu onRename={startEditing}>
				<SidebarMenuItem>
					<NavItem
						href={`/transactions/${account.id}`}
						className="group-has-data-[sidebar=menu-action]/menu-item:pr-2"
					>
						<div className="min-w-0 flex-1" ref={containerRef}>
							<input
								data-edit
								key={account.name}
								hidden
								aria-label="Account name"
								defaultValue={account.name}
								className="w-full outline-none"
								onBlur={handleBlur}
								onKeyDown={handleKeyDown}
							/>
							<span data-view className="block truncate">
								{account.name}
							</span>
						</div>
						<Money
							value={account.balance}
							className="shrink-0 text-xs text-muted-foreground group-focus-within/menu-item:invisible group-hover/menu-item:invisible group-has-data-open/menu-item:invisible"
						/>
					</NavItem>
					<AccountActionsMenu name={account.name} onRename={startEditing} />
				</SidebarMenuItem>
			</AccountContextMenu>
			<CloseAccount account={account} />
		</Dialog>
	);
};

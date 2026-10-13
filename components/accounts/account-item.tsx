"use client";
import { updateAccount } from "@/app/actions/accounts/mutations";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import NavItem from "../sidebar/nav-item";
import { Dialog } from "../ui/dialog";
import { Money } from "../money";
import { SidebarMenuItem } from "../ui/sidebar";
import AccountContextMenu from "./account-context-menu";
import CloseAccount from "./close-account";

export const AccountItem = ({ account }: { account: Account }) => {
	const { containerRef, startEditing, handleBlur, handleKeyDown } =
		useInlineEdit((value) => {
			updateAccount(account.id, { name: value });
		});

	return (
		<Dialog>
			<AccountContextMenu onRename={startEditing}>
				<SidebarMenuItem>
					<NavItem href={`/transactions/${account.id}`}>
						<div className="min-w-0 flex-1" ref={containerRef}>
							<input
								data-edit
								key={account.name}
								hidden
								id={"name"}
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
							className="shrink-0 text-xs tabular-nums text-muted-foreground"
						/>
					</NavItem>
				</SidebarMenuItem>
			</AccountContextMenu>
			<CloseAccount account={account} />
		</Dialog>
	);
};

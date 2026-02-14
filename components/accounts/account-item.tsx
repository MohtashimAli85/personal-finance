"use client";
import { useRef } from "react";
import { updateAccount } from "@/app/actions/accounts/mutations";
import { formatCurrency } from "@/lib/helper";
import NavItem from "../sidebar/nav-item";
import { Dialog } from "../ui/dialog";
import { SidebarMenuBadge, SidebarMenuItem } from "../ui/sidebar";
import AccountContextMenu from "./account-context-menu";
import CloseAccount from "./close-account";

export const AccountItem = ({ account }: { account: Account }) => {
	const ref = useRef<HTMLDivElement | null>(null);

	const handleBlur = () => {
		const inputEl = ref.current?.children[0] as HTMLInputElement;
		const labelEl = ref.current?.children[1] as HTMLSpanElement;

		inputEl.setAttribute("hidden", "true");
		labelEl.removeAttribute("hidden");
	};
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === "NumpadEnter") {
			const value = (e.target as HTMLInputElement).value.trim();
			if (value) {
				e.currentTarget.form?.requestSubmit();
				updateAccount(account.id, value);
				const labelEl = ref.current?.children[1] as HTMLSpanElement;
				labelEl.textContent = value;
			}
			handleBlur();
		}
	};
	return (
		<Dialog>
			<AccountContextMenu ref={ref}>
				<SidebarMenuItem>
					<NavItem href={`/transactions?account=${account.id}`}>
						<div className="grow max-w-30" ref={ref}>
							<input
								hidden
								id={"name"}
								defaultValue={account.name}
								className="outline-none"
								onBlur={handleBlur}
								onKeyDown={handleKeyDown}
							/>
							<span ref={ref}>{account.name}</span>
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

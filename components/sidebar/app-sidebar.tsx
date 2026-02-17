import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
} from "@/components/ui/sidebar";
import AccountsList from "../accounts/accounts-list";
import AddAccount from "../accounts/add-account";

export default function AppSidebar() {
	return (
		<Sidebar>
			<SidebarHeader>
				<div className="px-2 text-sm font-semibold">Personal Finance</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<AccountsList />
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<div className="flex flex-col gap-2">
					<AddAccount />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}

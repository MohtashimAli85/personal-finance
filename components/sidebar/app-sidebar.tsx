import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/tailwindcss/utils";
import AccountsList from "../accounts/accounts-list";
import AddAccount from "../accounts/add-account";
import Logo from "../logo";
import NavItem from "./nav-item";
import { navLinks } from "./nav-links";

export default function AppSidebar() {
	return (
		<Sidebar
			className={cn(
				"hover:left-0! has-data-[state=open]:left-0! group-has-[[data-sidebar-peek]:hover]/sidebar-wrapper:left-0!",
				"group-data-[collapsible=offcanvas]:z-20 group-data-[collapsible=offcanvas]:shadow-2xl",
				"group-data-[collapsible=offcanvas]:after:absolute group-data-[collapsible=offcanvas]:after:inset-y-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:after:w-3",
			)}
		>
			<SidebarHeader data-titlebar-drag>
				<div className="flex h-8 items-center gap-2 pl-2 text-sm font-semibold titlebar:pl-20">
					<Logo className="size-5 titlebar:hidden" />
					Personal Finance
					<SidebarTrigger className="ml-auto" />
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{navLinks.map(({ href, label, icon: Icon, exact }) => (
							<SidebarMenuItem key={href}>
								<NavItem href={href} exact={exact}>
									<Icon />
									<span>{label}</span>
								</NavItem>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
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

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import AccountsList from "../accounts/accounts-list";
import AddAccount from "../accounts/add-account";
import NavItem from "./nav-item";

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 text-sm font-semibold">Personal Finance</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavItem href="/">Dashboard</NavItem>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem href="/budget">Budget</NavItem>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem href="/transactions">Transactions</NavItem>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavItem href="/meezan">Meezan Transactions</NavItem>
            </SidebarMenuItem>
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

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, Wallet2Icon } from "lucide-react";
import Link from "next/link";
import AddAccount from "../accounts/add-account";
import AllAccounts from "../accounts/accounts-list";
import AddTransaction from "../transactions/add-transaction";
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
            <NavItem href="/budget">
              <Wallet2Icon />
              <span>Budget</span>
            </NavItem>
            <NavItem href="/">
              <Home />
              <span>Home</span>
            </NavItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <AllAccounts />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-2">
          <AddAccount />
          <AddTransaction />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

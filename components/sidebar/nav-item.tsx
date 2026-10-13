"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "../ui/sidebar";
import { isSectionPath } from "./nav-links";

const NavItem = ({
	children,
	href,
	exact,
}: {
	children: React.ReactNode;
	href: string;
	exact?: boolean;
}) => {
	const pathname = usePathname();
	const isActive = exact ? pathname === href : isSectionPath(pathname, href);
	return (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link href={href}>{children}</Link>
		</SidebarMenuButton>
	);
};

export default NavItem;

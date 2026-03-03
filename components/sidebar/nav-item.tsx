"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "../ui/sidebar";

const NavItem = ({
	children,
	href,
}: {
	children: React.ReactNode;
	href: string;
}) => {
	const pathname = usePathname();
	const isActive =
		pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
	return (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link href={href}>{children}</Link>
		</SidebarMenuButton>
	);
};

export default NavItem;

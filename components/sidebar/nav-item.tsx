"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SidebarMenuButton } from "../ui/sidebar";

const NavItem = ({
	children,
	href,
}: {
	children: React.ReactNode;
	href: string;
}) => {
	const searchParams = useSearchParams();
	const query = searchParams.toString();
	const pathname = usePathname();
	const currentPath = query ? `${pathname}?${query}` : pathname;
	const isActive = currentPath === href;
	return (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link href={href}>{children}</Link>
		</SidebarMenuButton>
	);
};

export default NavItem;

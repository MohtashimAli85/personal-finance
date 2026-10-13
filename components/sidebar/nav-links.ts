import {
	LayoutDashboard,
	Mail,
	ReceiptText,
	Settings,
	Sparkles,
	Target,
	Wallet,
} from "lucide-react";

export const navLinks = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/budget", label: "Budget", icon: Wallet },
	{
		href: "/transactions",
		label: "Transactions",
		icon: ReceiptText,
		exact: true,
	},
	{ href: "/bank-transactions", label: "Bank Transactions", icon: Mail },
	{ href: "/goals", label: "Goals", icon: Target },
	{ href: "/chat", label: "AI Coach", icon: Sparkles },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export const isSectionPath = (pathname: string, href: string) =>
	pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

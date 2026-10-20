import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono, Raleway } from "next/font/google";
import { cookies } from "next/headers";
import AppHeader from "@/components/header/app-header";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreProvider from "@/context/store-context";
import { getAccounts } from "@/lib/account";
import { getGroupedCategories } from "@/lib/category";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const figtree = Figtree({
	variable: "--font-figtree",
	subsets: ["latin"],
});

const raleway = Raleway({
	variable: "--font-raleway",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: { default: "Personal Finance", template: "%s · Personal Finance" },
	description: "Made by Mohtashim, github.com/mohtashimali85",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
	const accounts = getAccounts();
	const groupedCategories = getGroupedCategories();
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} ${raleway.variable} dark`}
		>
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script that sets privacy mode before paint
					dangerouslySetInnerHTML={{
						__html: `document.documentElement.dataset.privacy=localStorage.getItem("privacy-mode")==="on"?"on":"off"`,
					}}
				/>
			</head>
			<body className={`${geistMono.variable} antialiased`}>
				<StoreProvider initialData={{ accounts, groupedCategories }}>
					<TooltipProvider>
						<SidebarProvider defaultOpen={sidebarOpen}>
							<AppSidebar />
							<SidebarInset className="h-screen overflow-hidden">
								<AppHeader />
								<div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
									{children}
								</div>
							</SidebarInset>
						</SidebarProvider>
					</TooltipProvider>
					<Toaster theme="dark" position="bottom-right" />
				</StoreProvider>
			</body>
		</html>
	);
}

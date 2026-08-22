import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

export const metadata: Metadata = {
  title: "Personal Finance ",
  description: "Made by Mohtashim, github.com/mohtashimali85",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accounts = getAccounts();
  const groupedCategories = getGroupedCategories();
  return (
    <html lang="en" className={`${geistSans.variable} dark`}>
      <head>
        {/* {process.env.NODE_ENV === "development" && ( */}
        {/* <script
          // id="react-scan"
          // crossOrigin="anonymous"
          // strategy="afterInteractive"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        /> */}
        {/* )} */}
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <StoreProvider initialData={{ accounts, groupedCategories }}>
          <SidebarProvider>
            <AppSidebar />
            <main className="h-screen bg-background w-full flex flex-col p-4 gap-2 overflow-hidden">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CacheProvider from "@/context/cache-context";

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
  description: "Made by Moshi, github.com/mohtashimali85",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable + " dark"}>
      <head>
        {/* {process.env.NODE_ENV === "development" && ( */}
        <script
          defer
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
        {/* )} */}
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <CacheProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="min-h-screen bg-background w-full flex flex-col p-4 gap-2">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
        </CacheProvider>
      </body>
    </html>
  );
}

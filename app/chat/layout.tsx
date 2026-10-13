import type { Metadata } from "next";
import { connection } from "next/server";
import ChatShell from "@/components/chat/chat-shell";
import { listChats } from "@/lib/chat";

export const metadata: Metadata = {
	title: "AI Coach",
	description: "Talk through your budget and savings plans",
};

export default async function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await connection();
	return <ChatShell initialChats={listChats()}>{children}</ChatShell>;
}

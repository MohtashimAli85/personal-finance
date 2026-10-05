import { notFound } from "next/navigation";
import ChatView from "@/components/chat/chat-view";
import { availableModels } from "@/lib/ai/models";
import { getChat, loadChatMessages } from "@/lib/chat";

export default async function ChatPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	if (!getChat(id)) notFound();
	return (
		<ChatView
			key={id}
			id={id}
			initialMessages={loadChatMessages(id)}
			isNew={false}
			hasKey={availableModels().length > 0}
		/>
	);
}

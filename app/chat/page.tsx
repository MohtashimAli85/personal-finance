import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import ChatView from "@/components/chat/chat-view";
import { availableModels } from "@/lib/ai/models";

export default async function NewChatPage() {
	await connection();
	const id = randomUUID();
	return (
		<ChatView
			key={id}
			id={id}
			initialMessages={[]}
			isNew
			hasKey={availableModels().length > 0}
		/>
	);
}

import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import ChatView from "@/components/chat/chat-view";
import { availableModelEntries } from "@/lib/ai/models";
import { getProfile } from "@/lib/settings";

export default async function NewChatPage() {
	await connection();
	const id = randomUUID();
	return (
		<ChatView
			key={id}
			id={id}
			initialMessages={[]}
			isNew
			models={availableModelEntries()}
			hasProfile={Object.values(getProfile()).some(Boolean)}
		/>
	);
}

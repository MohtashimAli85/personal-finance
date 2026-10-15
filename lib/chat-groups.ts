import type { ChatSummary } from "@/lib/chat";

const DAY_MS = 24 * 60 * 60 * 1000;

export const CHAT_GROUP_LABELS = [
	"Today",
	"Yesterday",
	"Previous 7 days",
	"Previous 30 days",
	"Older",
] as const;

export type ChatGroupLabel = (typeof CHAT_GROUP_LABELS)[number];

export interface ChatGroup {
	label: ChatGroupLabel;
	chats: ChatSummary[];
}

// updatedAt is a SQLite UTC "YYYY-MM-DD HH:MM:SS" string
const toTime = (updatedAt: string | null) =>
	updatedAt
		? Date.parse(`${updatedAt.replace(" ", "T")}Z`)
		: Number.NEGATIVE_INFINITY;

export function groupChatsByDate(
	chats: ChatSummary[],
	now: Date = new Date(),
): ChatGroup[] {
	const startOfToday = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
	);
	const cutoffs: [ChatGroupLabel, number][] = [
		["Today", startOfToday],
		["Yesterday", startOfToday - DAY_MS],
		["Previous 7 days", startOfToday - 7 * DAY_MS],
		["Previous 30 days", startOfToday - 30 * DAY_MS],
	];

	const groups = new Map<ChatGroupLabel, ChatSummary[]>(
		CHAT_GROUP_LABELS.map((label) => [label, []]),
	);
	for (const chat of chats) {
		const time = toTime(chat.updatedAt);
		const label = cutoffs.find(([, cutoff]) => time >= cutoff)?.[0] ?? "Older";
		groups.get(label)?.push(chat);
	}

	return CHAT_GROUP_LABELS.flatMap((label) => {
		const grouped = groups.get(label) ?? [];
		return grouped.length > 0 ? [{ label, chats: grouped }] : [];
	});
}

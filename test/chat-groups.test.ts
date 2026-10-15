import { describe, expect, it } from "vitest";
import { groupChatsByDate } from "@/lib/chat-groups";

const NOW = new Date("2026-10-14T12:00:00Z");
const chat = (id: string, updatedAt: string | null) => ({
	id,
	title: id,
	updatedAt,
});

describe("groupChatsByDate", () => {
	it("buckets chats by UTC day ranges and drops empty groups", () => {
		const groups = groupChatsByDate(
			[
				chat("today", "2026-10-14 00:00:01"),
				chat("yesterday", "2026-10-13 23:59:59"),
				chat("week", "2026-10-08 00:00:00"),
				chat("month", "2026-09-20 08:00:00"),
				chat("old", "2026-01-01 00:00:00"),
			],
			NOW,
		);

		expect(groups.map((group) => [group.label, group.chats[0].id])).toEqual([
			["Today", "today"],
			["Yesterday", "yesterday"],
			["Previous 7 days", "week"],
			["Previous 30 days", "month"],
			["Older", "old"],
		]);
	});

	it("skips groups with no chats", () => {
		const groups = groupChatsByDate([chat("a", "2026-10-14 09:00:00")], NOW);
		expect(groups.map((group) => group.label)).toEqual(["Today"]);
	});

	it("puts chats without a timestamp in Older", () => {
		const groups = groupChatsByDate([chat("a", null)], NOW);
		expect(groups).toEqual([{ label: "Older", chats: [chat("a", null)] }]);
	});

	it("keeps the order of chats within a group", () => {
		const first = chat("first", "2026-10-14 10:00:00");
		const second = chat("second", "2026-10-14 08:00:00");
		const groups = groupChatsByDate([first, second], NOW);
		expect(groups[0].chats).toEqual([first, second]);
	});
});

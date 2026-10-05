export const WRITE_TOOL_NAMES = [
	"createSavingsGoal",
	"updateSavingsGoal",
	"setBudgetAmount",
] as const;

export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];

export const isWriteToolName = (name: string): name is WriteToolName =>
	(WRITE_TOOL_NAMES as readonly string[]).includes(name);

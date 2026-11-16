import type { ToolUIPart } from "ai";
import { formatMonthLabel } from "@/components/goals/month-label";
import type { CoachTools } from "@/lib/ai/message-types";

export type CoachToolPart = ToolUIPart<CoachTools>;
export type ToolInput = Record<string, unknown>;

export const rupees = (value: unknown) =>
	typeof value === "number"
		? `PKR ${Math.round(value).toLocaleString("en-US")}`
		: "-";

export const monthText = (value: unknown) =>
	typeof value === "string" ? formatMonthLabel(value) : "-";

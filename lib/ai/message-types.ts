import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import { z } from "zod";
import type { FinanceTools } from "./tools";

export const coachMetadataSchema = z.object({
	model: z.string().optional(),
	createdAt: z.number().optional(),
});

export type CoachMetadata = z.infer<typeof coachMetadataSchema>;
export type CoachTools = InferUITools<FinanceTools>;
export type CoachUIMessage = UIMessage<CoachMetadata, UIDataTypes, CoachTools>;

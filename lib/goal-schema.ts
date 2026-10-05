import { z } from "zod";

const monthKey = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a YYYY-MM month");

export const goalSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
	targetAmount: z.coerce
		.number<string | number>({ error: "Target must be a number" })
		.positive("Target must be more than 0"),
	targetMonth: z.union([monthKey, z.literal("")]).optional(),
	categoryId: z.string().optional(),
	notes: z.string().trim().max(500).optional(),
});

export type GoalValues = z.infer<typeof goalSchema>;
export type GoalInput = z.input<typeof goalSchema>;

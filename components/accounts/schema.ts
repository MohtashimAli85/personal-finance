import { z } from "zod";

export const accountSchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters"),
	initialBalance: z.coerce
		.number<string>({
			error: "Balance must be a number",
		})
		.min(0, "Balance cannot be negative"),
});
export type AccountValues = z.infer<typeof accountSchema>;
export type SchemaInput = z.input<typeof accountSchema>;

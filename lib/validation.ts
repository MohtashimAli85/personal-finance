import { z } from "zod";
import { isMonthKey, tryParseDateKey } from "@/lib/date";
import { toCents } from "@/lib/money";

export const id = z.string().min(1);
export const optionalId = z
	.string()
	.nullish()
	.transform((value) => value || null);
export const monthKey = z.string().refine(isMonthKey, "Month must be YYYY-MM");
export const dateKey = z.string().transform((value, ctx) => {
	const key = tryParseDateKey(value);
	if (key) return key;
	ctx.addIssue({ code: "custom", message: "Enter a valid date" });
	return z.NEVER;
});
export const requiredText = (label: string) =>
	z.string().trim().min(1, `${label} is required`);

/** A user-entered decimal amount ("150.50" or 150.5), as integer cents.
 * Every server action takes money this way; cents never cross the wire. */
export const cents = z.coerce
	.number<string | number>()
	.refine(Number.isFinite, "Enter a number")
	.transform(toCents);
export const positiveCents = cents.refine(
	(value) => value > 0,
	"Amount must be greater than zero",
);

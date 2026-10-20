import "server-only";
import { refresh } from "next/cache";
import type { z } from "zod";
import { UserError } from "@/lib/user-error";

export function invalidInput(error: z.ZodError): ActionState {
	const errors: NonNullable<ActionState["errors"]> = {};
	for (const issue of error.issues) {
		errors[String(issue.path[0] ?? "form")] ??= { message: issue.message };
	}
	return { success: false, message: error.issues[0]?.message, errors };
}

// biome-ignore lint/suspicious/noConfusingVoidType: a write with nothing to report returns nothing
type RunResult = ActionState | void;

/** Wraps a write in the app's action contract: validate the input, run it,
 * refresh the router on success, and return a UserError as ActionState. */
export function serverAction<S extends z.ZodType>(
	schema: S,
	run: (input: z.output<S>) => RunResult | Promise<ActionState | undefined>,
) {
	return async (input: z.input<S>): Promise<ActionState> => {
		const parsed = await schema.safeParseAsync(input);
		if (!parsed.success) return invalidInput(parsed.error);
		try {
			const result = (await run(parsed.data)) ?? { success: true };
			if (result.success) refresh();
			return result;
		} catch (error) {
			if (!(error instanceof UserError)) throw error;
			return {
				success: false,
				message: error.message,
				errors: error.field
					? { [error.field]: { message: error.message } }
					: undefined,
			};
		}
	};
}

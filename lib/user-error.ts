/** An expected failure whose message is safe to show the user. `field` ties
 * it to a form input. Server actions return it as ActionState; anything else
 * thrown is a bug and reaches the error boundary. */
export class UserError extends Error {
	constructor(
		message: string,
		readonly field?: string,
	) {
		super(message);
	}
}

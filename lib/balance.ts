import { sql } from "drizzle-orm";

/** An account's balance in cents: the sum of its transactions. Pending
 * (unreviewed) imports don't count until accepted. */
export const accountBalance = sql<number>`coalesce((
	select sum(coalesce(t.deposit, 0) - coalesce(t.payment, 0))
	from transactions t
	where t.account_id = accounts.id and t.status != 'pending'
), 0)`.mapWith(Number);

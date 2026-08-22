import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

export const getAccounts = cache((): Account[] => {
	return db
		.select()
		.from(accounts)
		.orderBy(asc(accounts.created_at))
		.all() as Account[];
});

export const getAccountById = cache((id: string): Account | null => {
	return (
		(db.select().from(accounts).where(eq(accounts.id, id)).get() as
			| Account
			| undefined) ?? null
	);
});

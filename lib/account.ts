import { cache } from "react";
import db from "@/app/actions/database";

export const getAccounts = cache((): Account[] => {
	return db
		.prepare("SELECT * FROM accounts ORDER BY created_at ASC")
		.all() as Account[];
});

export const getAccountById = cache((id: string): Account | null => {
	return (
		(db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account) ??
		null
	);
});

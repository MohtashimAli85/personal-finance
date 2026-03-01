import { cache } from "react";
import db from "@/app/actions/database";

type SummaryRow = {
	income: number;
	expense: number;
};

export const getSummary = cache((from: string, to: string): SummaryResponse => {
	const row = db
		.prepare(
			`
      SELECT
        COALESCE(SUM(deposit), 0) AS income,
        COALESCE(SUM(payment), 0) AS expense
      FROM transactions
      WHERE date >= ? AND date < ?
    `,
		)
		.get(from, to) as SummaryRow;

	return {
		income: Number(row?.income || 0),
		expense: Number(row?.expense || 0),
	};
});

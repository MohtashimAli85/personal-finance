import { format } from "date-fns";
import { sqlite } from "@/lib/db";
import { exportDatabase } from "@/lib/db/restore";

export function GET() {
	const fileName = `personal-finance-${format(new Date(), "yyyy-MM-dd")}.sqlite`;
	return new Response(exportDatabase(sqlite), {
		headers: {
			"Content-Type": "application/vnd.sqlite3",
			"Content-Disposition": `attachment; filename="${fileName}"`,
		},
	});
}

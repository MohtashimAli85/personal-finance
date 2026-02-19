import db from "@/app/actions/database";

export async function GET() {
	const accounts = db
		.prepare(
			"SELECT id, name, created_at, balance FROM accounts ORDER BY created_at ASC",
		)
		.all();

	return Response.json(accounts);
}

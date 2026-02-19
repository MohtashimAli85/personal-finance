import db from "@/app/actions/database";

export async function GET(
	_req: Request,
	ctx: RouteContext<"/api/accounts/[id]">,
) {
	const { id } = await ctx.params;
	const accounts = db.prepare("SELECT * FROM accounts WHERE id =?").all(id);

	console.log("Account:", accounts);
	return Response.json(accounts.length ? accounts[0] : null);
}

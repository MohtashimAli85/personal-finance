import db from "@/app/actions/database";

export async function GET() {
	const categories = db
		.prepare("SELECT * FROM categories ORDER BY name ASC")
		.all() as Category[];
	const category_groups = db
		.prepare("SELECT * FROM category_group ORDER BY name ASC")
		.all() as CategoryGroup[];

	const groupedCategories = category_groups.map((group) => ({
		...group,
		categories: categories.filter((cat) => cat.group_id === group.id),
	}));
	return Response.json(groupedCategories);
}

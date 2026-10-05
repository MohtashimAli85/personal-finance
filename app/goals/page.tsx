import type { Metadata } from "next";
import { connection } from "next/server";
import { getGroupedCategories } from "@/lib/category";
import { getGoals } from "@/lib/goal";
import GoalsClient from "./goals-client";

export const metadata: Metadata = {
	title: "Goals - Personal Finance",
	description: "Savings goals backed by your budget",
};

export default async function GoalsPage() {
	await connection();
	const goals = getGoals({ includeArchived: true });
	const linked = new Set(goals.map((goal) => goal.categoryId));
	const linkableCategories = getGroupedCategories()
		.filter((group) => !group.is_income)
		.flatMap((group) =>
			group.categories
				.filter((category) => !linked.has(category.id))
				.map((category) => ({
					id: category.id,
					name: category.name,
					groupName: group.name,
				})),
		);

	return <GoalsClient goals={goals} linkableCategories={linkableCategories} />;
}

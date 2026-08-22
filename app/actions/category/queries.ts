"use server";
import { asc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export async function getAllCategories(): Promise<Category[]> {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			group_id: categories.group_id,
		})
		.from(categories)
		.orderBy(asc(categories.name))
		.all() as Category[];
}

export async function getCategoryById(
	id: string,
): Promise<Category | undefined> {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			group_id: categories.group_id,
		})
		.from(categories)
		.where(eq(categories.id, id))
		.get() as Category | undefined;
}

export async function searchCategories(query: string): Promise<Category[]> {
	const searchPattern = `%${query}%`;
	return db
		.select({
			id: categories.id,
			name: categories.name,
			group_id: categories.group_id,
		})
		.from(categories)
		.where(like(categories.name, searchPattern))
		.orderBy(asc(categories.name))
		.limit(20)
		.all() as Category[];
}

"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, category_group } from "@/lib/db/schema";

const revalidateCategories = () => {
	revalidatePath("/categories");
	revalidatePath("/transactions");
	revalidatePath("/budget");
};

export async function createCategory(formData: FormData) {
	const name = formData.get("name") as string;
	const group_id = formData.get("group_id") as string | null;
	db.transaction(() =>
		db
			.insert(categories)
			.values({ id: crypto.randomUUID(), name, group_id: group_id || null })
			.run(),
	);
	revalidateCategories();
}

export async function updateCategory(formData: FormData) {
	const id = formData.get("id") as string;
	const name = formData.get("name") as string;
	const group_id = formData.get("group_id") as string | null;
	db.transaction(() =>
		db
			.update(categories)
			.set({ name, group_id: group_id || null })
			.where(eq(categories.id, id))
			.run(),
	);
	revalidateCategories();
}

export async function deleteCategory(formData: FormData) {
	const id = formData.get("id") as string;
	db.transaction(() =>
		db.delete(categories).where(eq(categories.id, id)).run(),
	);
	revalidateCategories();
}

export async function createCategoryGroup(formData: FormData) {
	const name = formData.get("name") as string;
	db.transaction(() =>
		db.insert(category_group).values({ id: crypto.randomUUID(), name }).run(),
	);
	revalidateCategories();
}

export async function updateCategoryGroup(formData: FormData) {
	const id = formData.get("id") as string;
	const name = formData.get("name") as string;
	db.transaction(() =>
		db
			.update(category_group)
			.set({ name })
			.where(eq(category_group.id, id))
			.run(),
	);
	revalidateCategories();
}

export async function deleteCategoryGroup(formData: FormData) {
	const id = formData.get("id") as string;
	db.transaction(() =>
		db.delete(category_group).where(eq(category_group.id, id)).run(),
	);
	revalidateCategories();
}

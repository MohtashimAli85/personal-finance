"use server";
import { revalidatePath } from "next/cache";
import db from "@/app/actions/database";

const revalidateCategories = () => {
	revalidatePath("/categories");
	revalidatePath("/transactions");
	revalidatePath("/budget");
};

export async function createCategory(formData: FormData) {
	const name = formData.get("name") as string;
	const group_id = formData.get("group_id") as string | null;
	const stmt = db.prepare(
		"INSERT INTO categories (id, name, group_id) VALUES (?, ?, ?)",
	);
	db.transaction(() => stmt.run(crypto.randomUUID(), name, group_id || null))();
	revalidateCategories();
}

export async function updateCategory(formData: FormData) {
	const id = formData.get("id") as string;
	const name = formData.get("name") as string;
	const group_id = formData.get("group_id") as string | null;
	const stmt = db.prepare(
		"UPDATE categories SET name = ?, group_id = ? WHERE id = ?",
	);
	db.transaction(() => stmt.run(name, group_id || null, id))();
	revalidateCategories();
}

export async function deleteCategory(formData: FormData) {
	const id = formData.get("id") as string;
	const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
	db.transaction(() => stmt.run(id))();
	revalidateCategories();
}

export async function createCategoryGroup(formData: FormData) {
	const name = formData.get("name") as string;
	const stmt = db.prepare(
		"INSERT INTO category_group (id, name) VALUES (?, ?)",
	);
	db.transaction(() => stmt.run(crypto.randomUUID(), name))();
	revalidateCategories();
}

export async function updateCategoryGroup(formData: FormData) {
	const id = formData.get("id") as string;
	const name = formData.get("name") as string;
	const stmt = db.prepare("UPDATE category_group SET name = ? WHERE id = ?");
	db.transaction(() => stmt.run(name, id))();
	revalidateCategories();
}

export async function deleteCategoryGroup(formData: FormData) {
	const id = formData.get("id") as string;
	const stmt = db.prepare("DELETE FROM category_group WHERE id = ?");
	db.transaction(() => stmt.run(id))();
	revalidateCategories();
}

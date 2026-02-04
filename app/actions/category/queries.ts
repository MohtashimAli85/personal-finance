import db from "@/app/actions/database";
import { Category } from "@/app/actions/types";

export async function getAllCategories(): Promise<Category[]> {
  return db
    .prepare("SELECT id, name FROM categories ORDER BY name")
    .all() as Category[];
}

export async function getCategoryById(
  id: string,
): Promise<Category | undefined> {
  return db.prepare("SELECT id, name FROM categories WHERE id = ?").get(id) as
    | Category
    | undefined;
}

export async function searchCategories(query: string): Promise<Category[]> {
  const searchPattern = `%${query}%`;
  return db
    .prepare(
      "SELECT id, name FROM categories WHERE name LIKE ? ORDER BY name LIMIT 20",
    )
    .all(searchPattern) as Category[];
}

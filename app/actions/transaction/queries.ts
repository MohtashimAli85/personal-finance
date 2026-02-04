import db from "@/app/actions/database";
import { Transaction } from "@/app/actions/types";

export async function getAllTransactions(
  limit = 100,
  offset = 0,
): Promise<Transaction[]> {
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `,
    )
    .all(limit, offset) as Transaction[];
}

export async function getTransactionById(
  id: string,
): Promise<Transaction | undefined> {
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE id = ?
    `,
    )
    .get(id) as Transaction | undefined;
}

export async function getTransactionsByAccount(
  accountId: string,
  limit = 100,
): Promise<Transaction[]> {
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE account_id = ?
      ORDER BY date DESC
      LIMIT ?
    `,
    )
    .all(accountId, limit) as Transaction[];
}

export async function getTransactionsByCategory(
  categoryId: string,
  limit = 100,
): Promise<Transaction[]> {
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE category_id = ?
      ORDER BY date DESC
      LIMIT ?
    `,
    )
    .all(categoryId, limit) as Transaction[];
}

export async function getTransactionsByDateRange(
  startDate: number,
  endDate: number,
): Promise<Transaction[]> {
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `,
    )
    .all(startDate, endDate) as Transaction[];
}

export async function searchTransactions(
  query: string,
  limit = 50,
): Promise<Transaction[]> {
  const searchPattern = `%${query}%`;
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE description LIKE ? OR notes LIKE ?
      ORDER BY date DESC
      LIMIT ?
    `,
    )
    .all(searchPattern, searchPattern, limit) as Transaction[];
}

export async function getRecentTransactions(days = 30): Promise<Transaction[]> {
  const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
  return db
    .prepare(
      `
      SELECT id, amount, date, description, notes, account_id, category_id
      FROM transactions
      WHERE date >= ?
      ORDER BY date DESC
    `,
    )
    .all(cutoffDate) as Transaction[];
}

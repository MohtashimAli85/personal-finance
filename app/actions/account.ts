"use server";
import db from "@/app/actions/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export interface Account {
  id: string;
  name: string;
  balance: number;
}
export interface AccountSummary extends Account {
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
}
export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const initialBalance = parseFloat(formData.get("initialBalance") as string);
  const stmt = db.prepare("INSERT INTO accounts (name, balance) VALUES (?, ?)");
  db.transaction(() => stmt.run(name, initialBalance))();
  redirect("/");
  // return result.lastInsertRowid as number;
}
export async function updateAccount(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const stmt = db.prepare("UPDATE accounts SET name = ? WHERE id = ?");
  db.transaction(() => stmt.run(name, id))();
  revalidatePath("/accounts");
}

export async function deleteAccount(id: string): Promise<void> {
  const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
  db.transaction(() => stmt.run(id))();
}

export async function accountExists(): Promise<boolean> {
  const row = db.prepare("SELECT 1 FROM accounts LIMIT 1").get();
  return !!row;
}

export async function getAllAccounts(): Promise<Account[]> {
  return db
    .prepare("SELECT id, name, balance FROM accounts ORDER BY name")
    .all() as Account[];
}
export async function getAccountCount(): Promise<number> {
  const row = db.prepare("SELECT COUNT(*) as count FROM accounts").get() as {
    count: number;
  };
  return row.count;
}
export async function getAccounts(limit = 10, offset = 0): Promise<Account[]> {
  return db
    .prepare(
      "SELECT id, name, balance FROM accounts ORDER BY name LIMIT ? OFFSET ?",
    )
    .all(limit, offset) as Account[];
}
export async function getAccountById(id: string): Promise<Account | undefined> {
  return db
    .prepare("SELECT id, name, balance FROM accounts WHERE id = ?")
    .get(id) as Account | undefined;
}

export async function getAccountWithSummary(
  id: string,
): Promise<AccountSummary | undefined> {
  const account = await getAccountById(id);
  if (!account) return undefined;

  const stats = db
    .prepare(
      `
      SELECT 
        COUNT(*) as transactionCount,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as totalExpense
      FROM transactions
      WHERE account_id = ?
    `,
    )
    .get(id) as {
    transactionCount: number;
    totalIncome: number;
    totalExpense: number;
  };

  return {
    ...account,
    transactionCount: stats.transactionCount || 0,
    totalIncome: stats.totalIncome || 0,
    totalExpense: stats.totalExpense || 0,
  };
}

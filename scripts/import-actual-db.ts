import Database from "better-sqlite3";
import path from "node:path";

const sourcePath = path.join(
  process.env.HOME ?? "",
  "Downloads/2026-09-22-My Finances/db.sqlite",
);
const targetPath = process.env.APP_DB_PATH ?? path.join(process.cwd(), "db.sqlite");

const source = new Database(sourcePath, { readonly: true });
const target = new Database(targetPath);
target.pragma("foreign_keys = ON");

type Account = {
  id: string;
  name: string;
  offbudget: number;
  closed: number;
  tombstone: number;
};

type Group = {
  id: string;
  name: string;
  is_income: number;
  sort_order: number;
  tombstone: number;
  hidden: number;
};

type Category = {
  id: string;
  name: string;
  cat_group: string;
  sort_order: number;
  tombstone: number;
  hidden: number;
};

type SourceTransaction = {
  id: string;
  acct: string;
  category: string | null;
  amount: number;
  description: string | null;
  notes: string | null;
  imported_description: string | null;
  date: number;
  financial_id: string | null;
  pending: number;
  tombstone: number;
};

const activeAccounts = source
  .prepare(
    "select id, name, offbudget, closed, tombstone from accounts where tombstone = 0 and closed = 0 order by sort_order, name",
  )
  .all() as Account[];
const activeAccountIds = new Set(activeAccounts.map((account) => account.id));

const activeGroups = source
  .prepare(
    "select id, name, is_income, sort_order, tombstone, hidden from category_groups where tombstone = 0 and hidden = 0 order by sort_order, name",
  )
  .all() as Group[];
const activeGroupIds = new Set(activeGroups.map((group) => group.id));

const activeCategories = source
  .prepare(
    "select id, name, cat_group, sort_order, tombstone, hidden from categories where tombstone = 0 and hidden = 0 order by cat_group, sort_order, name",
  )
  .all() as Category[];

const payees = new Map<string, string>(
  (source.prepare("select id, name from payees where tombstone = 0").all() as Array<{
    id: string;
    name: string;
  }>).map((payee) => [payee.id, payee.name]),
);

const sourceTransactions = source
  .prepare(
    "select id, acct, category, amount, description, notes, imported_description, date, financial_id, pending, tombstone from transactions where tombstone = 0 order by date, sort_order, id",
  )
  .all() as SourceTransaction[];

const importedTransactions = sourceTransactions.filter((transaction) =>
  activeAccountIds.has(transaction.acct),
);

const usedCategoryNames = new Set<string>();
const categoryNameById = new Map<string, string>();
for (const category of activeCategories) {
  if (!activeGroupIds.has(category.cat_group)) continue;
  let name = category.name;
  const group = activeGroups.find((item) => item.id === category.cat_group);
  if (usedCategoryNames.has(name) && group) name = `${group.name}: ${name}`;
  usedCategoryNames.add(name);
  categoryNameById.set(category.id, name);
}

const formatDate = (value: number) => {
  const raw = String(value);
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};

target.transaction(() => {
  target.exec(
    "delete from transactions; delete from monthly_budgets; delete from categories; delete from category_group; delete from accounts;",
  );

  const insertAccount = target.prepare(
    "insert into accounts (id, name, balance, account_type, closed_at) values (?, ?, ?, ?, null)",
  );
  const insertGroup = target.prepare(
    "insert into category_group (id, name, sort_order, is_income) values (?, ?, ?, ?)",
  );
  const insertCategory = target.prepare(
    "insert into categories (id, name, group_id, sort_order) values (?, ?, ?, ?)",
  );
  const insertTransaction = target.prepare(
    "insert into transactions (id, account_id, category_id, payment, notes, date, deposit, source, status) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertBudget = target.prepare(
    "insert or replace into monthly_budgets (category_id, month, amount) values (?, ?, ?)",
  );

  const balances = new Map<string, number>();
  for (const transaction of importedTransactions) {
    balances.set(
      transaction.acct,
      (balances.get(transaction.acct) ?? 0) + transaction.amount,
    );
  }

  for (const account of activeAccounts) {
    insertAccount.run(
      account.id,
      account.name,
      balances.get(account.id) ?? 0,
      account.offbudget ? "off_budget" : "on_budget",
    );
  }

  for (const group of activeGroups) {
    insertGroup.run(group.id, group.name, Math.round(group.sort_order), group.is_income ? 1 : 0);
  }

  for (const category of activeCategories) {
    if (!activeGroupIds.has(category.cat_group)) continue;
    insertCategory.run(
      category.id,
      categoryNameById.get(category.id),
      category.cat_group,
      Math.round(category.sort_order),
    );
  }

  for (const transaction of importedTransactions) {
    const amount = Number(transaction.amount) || 0;
    const description = transaction.description
      ? payees.get(transaction.description) || null
      : null;
    const notes = [description, transaction.notes, transaction.imported_description]
      .filter(Boolean)
      .join(" - ") || null;
    const categoryId = transaction.category && categoryNameById.has(transaction.category)
      ? transaction.category
      : null;
    insertTransaction.run(
      transaction.id,
      transaction.acct,
      categoryId,
      amount < 0 ? Math.abs(amount) : null,
      notes,
      formatDate(transaction.date),
      amount > 0 ? amount : null,
      "import",
      transaction.pending ? "pending" : "cleared",
    );
  }

  const budgets = source
    .prepare(
      "select category, month, amount from zero_budgets where category in (select id from categories where tombstone = 0 and hidden = 0)",
    )
    .all() as Array<{ category: string; month: number; amount: number }>;
  for (const budget of budgets) {
    if (!categoryNameById.has(budget.category)) continue;
    const month = String(budget.month);
    insertBudget.run(budget.category, `${month.slice(0, 4)}-${month.slice(4, 6)}`, budget.amount);
  }
})();

console.log(
  JSON.stringify(
    {
      sourcePath,
      accounts: activeAccounts.length,
      groups: activeGroups.length,
      categories: categoryNameById.size,
      transactions: importedTransactions.length,
      budgets: target.prepare("select count(*) as count from monthly_budgets").get(),
    },
    null,
    2,
  ),
);

source.close();
target.close();
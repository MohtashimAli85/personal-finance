import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const sourcePath = process.argv[2];
if (!sourcePath) {
	console.error(
		'Usage: pnpm tsx scripts/import-actual-db.ts "<path to Actual export>/db.sqlite"',
	);
	process.exit(1);
}
const targetPath =
	process.env.APP_DB_PATH ?? path.join(process.cwd(), "db.sqlite");

const source = new Database(sourcePath, { readonly: true });
const target = new Database(targetPath);
target.pragma("foreign_keys = ON");
migrate(drizzle({ client: target }), {
	migrationsFolder: path.join(process.cwd(), "drizzle"),
});

interface Account {
	id: string;
	name: string;
	offbudget: number;
	closed: number;
}
interface Group {
	id: string;
	name: string;
	is_income: number;
	sort_order: number;
	hidden: number;
}
interface Category {
	id: string;
	name: string;
	cat_group: string;
	sort_order: number;
	hidden: number;
}
interface SourceTransaction {
	id: string;
	account: string;
	category: string | null;
	amount: number;
	payee_name: string | null;
	notes: string | null;
	imported_payee: string | null;
	date: number;
	transfer_id: string | null;
	pending: number | null;
}

const accounts = source
	.prepare(
		"select id, name, offbudget, closed from accounts where tombstone = 0 order by sort_order, name",
	)
	.all() as Account[];
const groups = source
	.prepare(
		"select id, name, is_income, sort_order, hidden from category_groups where tombstone = 0 order by sort_order, name",
	)
	.all() as Group[];
const groupIds = new Set(groups.map((g) => g.id));
const categoryRows = (
	source
		.prepare(
			"select id, name, cat_group, sort_order, hidden from categories where tombstone = 0 order by cat_group, sort_order, name",
		)
		.all() as Category[]
).filter((c) => groupIds.has(c.cat_group));

const categoryNames = new Map<string, string>();
const usedNames = new Set<string>();
for (const category of categoryRows) {
	const group = groups.find((g) => g.id === category.cat_group);
	const name =
		usedNames.has(category.name) && group
			? `${group.name}: ${category.name}`
			: category.name;
	usedNames.add(name);
	categoryNames.set(category.id, name);
}

const accountIds = new Set(accounts.map((a) => a.id));
const transactions = (
	source
		.prepare(
			`select v.id, v.account, v.category, v.amount, p.name as payee_name, v.notes,
				v.imported_payee, v.date, v.transfer_id, t.pending
			from v_transactions_internal_alive v
			join transactions t on t.id = v.id
			left join payees p on p.id = v.payee
			where v.is_parent = 0
			order by v.date, v.sort_order, v.id`,
		)
		.all() as SourceTransaction[]
).filter((t) => accountIds.has(t.account));
const transactionIds = new Set(transactions.map((t) => t.id));

const budgets = (
	source
		.prepare("select category, month, amount, carryover from zero_budgets")
		.all() as Array<{
		category: string;
		month: number;
		amount: number;
		carryover: number;
	}>
).filter((b) => categoryNames.has(b.category));
const holds = source
	.prepare("select id, buffered from zero_budget_months where buffered <> 0")
	.all() as Array<{ id: string; buffered: number }>;

const monthKey = (value: number | string) => {
	const raw = String(value).replace("-", "");
	return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
};
const dateKey = (value: number) => {
	const raw = String(value);
	return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};
const transferKey = (t: SourceTransaction) =>
	t.transfer_id && transactionIds.has(t.transfer_id)
		? [t.id, t.transfer_id].sort().join(":")
		: null;

interface KeptGoal {
	name: string;
	target_amount: number;
	target_month: string | null;
	notes: string | null;
	achieved_at: string | null;
	archived_at: string | null;
	category_name: string;
	group_name: string | null;
}
const keptGoals = target
	.prepare(
		`select g.name, g.target_amount, g.target_month, g.notes, g.achieved_at, g.archived_at,
			c.name as category_name, cg.name as group_name
		from goals g
		join categories c on c.id = g.category_id
		left join category_group cg on cg.id = c.group_id`,
	)
	.all() as KeptGoal[];
const keptBudgets = target
	.prepare(
		`select c.name as category_name, b.month, b.amount, b.carryover
		from monthly_budgets b join categories c on c.id = b.category_id
		where b.category_id in (select category_id from goals)`,
	)
	.all() as Array<{
	category_name: string;
	month: string;
	amount: number;
	carryover: number;
}>;

function restoreGoals() {
	const findCategory = target.prepare(
		"select id from categories where lower(name) = lower(?)",
	);
	const findGroup = target.prepare(
		"select id from category_group where lower(name) = lower(?)",
	);
	const nextGroupSort = target.prepare(
		"select coalesce(max(sort_order), 0) + 1 as next from category_group where is_income = 0",
	);
	for (const goal of keptGoals) {
		let category = findCategory.get(goal.category_name) as
			| { id: string }
			| undefined;
		if (!category) {
			const groupName = goal.group_name ?? "Savings Goals";
			let group = findGroup.get(groupName) as { id: string } | undefined;
			if (!group) {
				group = { id: crypto.randomUUID() };
				target
					.prepare(
						"insert into category_group (id, name, sort_order) values (?, ?, ?)",
					)
					.run(
						group.id,
						groupName,
						(nextGroupSort.get() as { next: number }).next,
					);
			}
			category = { id: crypto.randomUUID() };
			target
				.prepare("insert into categories (id, name, group_id) values (?, ?, ?)")
				.run(category.id, goal.category_name, group.id);
			for (const b of keptBudgets.filter(
				(row) => row.category_name === goal.category_name,
			)) {
				target
					.prepare(
						"insert or replace into monthly_budgets (category_id, month, amount, carryover) values (?, ?, ?, ?)",
					)
					.run(category.id, b.month, b.amount, b.carryover);
			}
		}
		target
			.prepare(
				"insert into goals (id, name, target_amount, target_month, category_id, notes, achieved_at, archived_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				crypto.randomUUID(),
				goal.name,
				goal.target_amount,
				goal.target_month,
				category.id,
				goal.notes,
				goal.achieved_at,
				goal.archived_at,
			);
	}
}

target.transaction(() => {
	target.exec(`
		DROP TRIGGER IF EXISTS prevent_income_group_delete;
		UPDATE bank_sender_configs SET account_id = NULL;
		DELETE FROM goals;
		DELETE FROM transactions;
		DELETE FROM monthly_budgets;
		DELETE FROM budget_months;
		DELETE FROM categories;
		DELETE FROM category_group;
		DELETE FROM accounts;
	`);

	const balances = new Map<string, number>();
	for (const t of transactions) {
		balances.set(t.account, (balances.get(t.account) ?? 0) + t.amount);
	}

	const insertAccount = target.prepare(
		"insert into accounts (id, name, balance, account_type, closed_at) values (?, ?, ?, ?, ?)",
	);
	for (const a of accounts) {
		insertAccount.run(
			a.id,
			a.name,
			balances.get(a.id) ?? 0,
			a.offbudget ? "off_budget" : "on_budget",
			a.closed ? new Date().toISOString() : null,
		);
	}

	const insertGroup = target.prepare(
		"insert into category_group (id, name, sort_order, is_income, hidden) values (?, ?, ?, ?, ?)",
	);
	for (const g of groups) {
		insertGroup.run(
			g.id,
			g.name,
			Math.round(g.sort_order),
			g.is_income,
			g.hidden,
		);
	}

	const insertCategory = target.prepare(
		"insert into categories (id, name, group_id, sort_order, hidden) values (?, ?, ?, ?, ?)",
	);
	for (const c of categoryRows) {
		insertCategory.run(
			c.id,
			categoryNames.get(c.id),
			c.cat_group,
			Math.round(c.sort_order),
			c.hidden,
		);
	}

	const insertTransaction = target.prepare(
		"insert into transactions (id, account_id, category_id, payment, notes, date, deposit, source, status, transfer_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	);
	for (const t of transactions) {
		const notes =
			[t.payee_name, t.notes, t.imported_payee].filter(Boolean).join(" - ") ||
			null;
		insertTransaction.run(
			t.id,
			t.account,
			t.category && categoryNames.has(t.category) ? t.category : null,
			t.amount < 0 ? -t.amount : null,
			notes,
			dateKey(t.date),
			t.amount > 0 ? t.amount : null,
			"import",
			t.pending ? "pending" : "cleared",
			transferKey(t),
		);
	}

	const insertBudget = target.prepare(
		"insert or replace into monthly_budgets (category_id, month, amount, carryover) values (?, ?, ?, ?)",
	);
	for (const b of budgets) {
		insertBudget.run(b.category, monthKey(b.month), b.amount, b.carryover);
	}

	const insertHold = target.prepare(
		"insert into budget_months (month, buffered) values (?, ?)",
	);
	for (const h of holds) insertHold.run(monthKey(h.id), h.buffered);

	restoreGoals();
})();

console.log(
	JSON.stringify(
		{
			sourcePath,
			targetPath,
			accounts: accounts.length,
			groups: groups.length,
			categories: categoryRows.length,
			transactions: transactions.length,
			budgets: budgets.length,
			holds: holds.length,
			goalsKept: keptGoals.length,
		},
		null,
		2,
	),
);

source.close();
target.close();

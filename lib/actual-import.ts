import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
	CREATE_INCOME_GROUP_TRIGGER,
	DROP_INCOME_GROUP_TRIGGER,
} from "./db/income-trigger";
import { isZip, readZipEntry } from "./zip";

const SQLITE_MAGIC = "SQLite format 3\0";
const REQUIRED_TABLES = [
	"accounts",
	"category_groups",
	"categories",
	"transactions",
	"payees",
	"zero_budgets",
	"zero_budget_months",
	"v_transactions_internal_alive",
];
const NOT_AN_EXPORT =
	"This isn't an Actual Budget export. Choose the .zip from Actual's Settings → Export, or its db.sqlite.";

export class ActualImportError extends Error {}

interface SourceAccount {
	id: string;
	name: string;
	offbudget: number;
	closed: number;
}
interface SourceGroup {
	id: string;
	name: string;
	is_income: number;
	sort_order: number;
	hidden: number;
}
interface SourceCategory {
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
interface SourceBudget {
	category: string;
	month: number;
	amount: number;
	carryover: number;
}
interface SourceHold {
	id: string;
	buffered: number;
}

export interface ActualData {
	accounts: SourceAccount[];
	groups: SourceGroup[];
	categories: Array<SourceCategory & { displayName: string }>;
	transactions: SourceTransaction[];
	budgets: SourceBudget[];
	holds: SourceHold[];
}

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

export interface ActualPreview {
	accounts: number;
	groups: number;
	categories: number;
	transactions: number;
	budgets: number;
	holds: number;
	goals: Array<{ name: string; category: string }>;
}

function readSource(source: Database.Database): ActualData {
	const tables = new Set(
		(
			source.prepare("select name from sqlite_master").all() as Array<{
				name: string;
			}>
		).map((row) => row.name),
	);
	if (!REQUIRED_TABLES.every((name) => tables.has(name))) {
		throw new ActualImportError(NOT_AN_EXPORT);
	}

	const accounts = source
		.prepare(
			"select id, name, offbudget, closed from accounts where tombstone = 0 order by sort_order, name",
		)
		.all() as SourceAccount[];
	const groups = source
		.prepare(
			"select id, name, is_income, sort_order, hidden from category_groups where tombstone = 0 order by sort_order, name",
		)
		.all() as SourceGroup[];
	const groupNames = new Map(groups.map((g) => [g.id, g.name]));
	const categoryRows = (
		source
			.prepare(
				"select id, name, cat_group, sort_order, hidden from categories where tombstone = 0 order by cat_group, sort_order, name",
			)
			.all() as SourceCategory[]
	).filter((c) => groupNames.has(c.cat_group));

	const usedNames = new Set<string>();
	const categories = categoryRows.map((category) => {
		const displayName = usedNames.has(category.name)
			? `${groupNames.get(category.cat_group)}: ${category.name}`
			: category.name;
		usedNames.add(displayName);
		return { ...category, displayName };
	});
	const categoryIds = new Set(categories.map((c) => c.id));

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

	const budgets = (
		source
			.prepare("select category, month, amount, carryover from zero_budgets")
			.all() as SourceBudget[]
	).filter((b) => categoryIds.has(b.category));
	const holds = source
		.prepare("select id, buffered from zero_budget_months where buffered <> 0")
		.all() as SourceHold[];

	return { accounts, groups, categories, transactions, budgets, holds };
}

export function loadActualData(file: Buffer): ActualData {
	let sqliteBytes = file;
	if (isZip(file)) {
		let entry: Buffer | null = null;
		try {
			entry = readZipEntry(file, "db.sqlite");
		} catch {}
		if (!entry) throw new ActualImportError(NOT_AN_EXPORT);
		sqliteBytes = entry;
	}
	if (sqliteBytes.toString("latin1", 0, SQLITE_MAGIC.length) !== SQLITE_MAGIC) {
		throw new ActualImportError(NOT_AN_EXPORT);
	}

	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-actual-"));
	const sourcePath = path.join(dir, "db.sqlite");
	let source: Database.Database | undefined;
	try {
		fs.writeFileSync(sourcePath, sqliteBytes);
		source = new Database(sourcePath, { readonly: true });
		return readSource(source);
	} catch (error) {
		if (error instanceof ActualImportError) throw error;
		throw new ActualImportError(NOT_AN_EXPORT);
	} finally {
		source?.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

function readKeptGoals(target: Database.Database) {
	const goals = target
		.prepare(
			`select g.name, g.target_amount, g.target_month, g.notes, g.achieved_at, g.archived_at,
				c.name as category_name, cg.name as group_name
			from goals g
			join categories c on c.id = g.category_id
			left join category_group cg on cg.id = c.group_id`,
		)
		.all() as KeptGoal[];
	const budgets = target
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
	return { goals, budgets };
}

const summarize = (data: ActualData, goals: KeptGoal[]): ActualPreview => ({
	accounts: data.accounts.length,
	groups: data.groups.length,
	categories: data.categories.length,
	transactions: data.transactions.length,
	budgets: data.budgets.length,
	holds: data.holds.length,
	goals: goals.map((g) => ({ name: g.name, category: g.category_name })),
});

export const previewActualImport = (
	target: Database.Database,
	data: ActualData,
) => summarize(data, readKeptGoals(target).goals);

const monthKey = (value: number | string) => {
	const raw = String(value).replace("-", "");
	return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
};
const dateKey = (value: number) => {
	const raw = String(value);
	return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};

function restoreGoals(
	target: Database.Database,
	{ goals, budgets }: ReturnType<typeof readKeptGoals>,
) {
	const findCategory = target.prepare(
		"select id from categories where lower(name) = lower(?)",
	);
	const findGroup = target.prepare(
		"select id from category_group where lower(name) = lower(?)",
	);
	const nextGroupSort = target.prepare(
		"select coalesce(max(sort_order), 0) + 1 as next from category_group where is_income = 0",
	);
	const insertGroup = target.prepare(
		"insert into category_group (id, name, sort_order) values (?, ?, ?)",
	);
	const insertCategory = target.prepare(
		"insert into categories (id, name, group_id) values (?, ?, ?)",
	);
	const insertBudget = target.prepare(
		"insert or replace into monthly_budgets (category_id, month, amount, carryover) values (?, ?, ?, ?)",
	);
	const insertGoal = target.prepare(
		"insert into goals (id, name, target_amount, target_month, category_id, notes, achieved_at, archived_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
	);

	for (const goal of goals) {
		let category = findCategory.get(goal.category_name) as
			| { id: string }
			| undefined;
		if (!category) {
			const groupName = goal.group_name ?? "Savings Goals";
			let group = findGroup.get(groupName) as { id: string } | undefined;
			if (!group) {
				group = { id: crypto.randomUUID() };
				insertGroup.run(
					group.id,
					groupName,
					(nextGroupSort.get() as { next: number }).next,
				);
			}
			category = { id: crypto.randomUUID() };
			insertCategory.run(category.id, goal.category_name, group.id);
			for (const b of budgets.filter(
				(row) => row.category_name === goal.category_name,
			)) {
				insertBudget.run(category.id, b.month, b.amount, b.carryover);
			}
		}
		insertGoal.run(
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

export function applyActualImport(
	target: Database.Database,
	data: ActualData,
): ActualPreview {
	const kept = readKeptGoals(target);
	const categoryNames = new Map(data.categories.map((c) => [c.id, c.id]));
	const transactionIds = new Set(data.transactions.map((t) => t.id));
	const transferKey = (t: SourceTransaction) =>
		t.transfer_id && transactionIds.has(t.transfer_id)
			? [t.id, t.transfer_id].sort().join(":")
			: null;

	target.transaction(() => {
		target.exec(`
			${DROP_INCOME_GROUP_TRIGGER};
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
		for (const t of data.transactions) {
			balances.set(t.account, (balances.get(t.account) ?? 0) + t.amount);
		}

		const insertAccount = target.prepare(
			"insert into accounts (id, name, balance, account_type, closed_at) values (?, ?, ?, ?, ?)",
		);
		for (const a of data.accounts) {
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
		for (const g of data.groups) {
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
		for (const c of data.categories) {
			insertCategory.run(
				c.id,
				c.displayName,
				c.cat_group,
				Math.round(c.sort_order),
				c.hidden,
			);
		}

		const insertTransaction = target.prepare(
			"insert into transactions (id, account_id, category_id, payment, notes, date, deposit, source, status, transfer_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		);
		for (const t of data.transactions) {
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
		for (const b of data.budgets) {
			insertBudget.run(b.category, monthKey(b.month), b.amount, b.carryover);
		}

		const insertHold = target.prepare(
			"insert into budget_months (month, buffered) values (?, ?)",
		);
		for (const h of data.holds) insertHold.run(monthKey(h.id), h.buffered);

		restoreGoals(target, kept);
		target.exec(CREATE_INCOME_GROUP_TRIGGER);
	})();

	return summarize(data, kept.goals);
}

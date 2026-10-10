CREATE TABLE `budget_months` (
	`month` text PRIMARY KEY NOT NULL,
	`buffered` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `category_group` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_budgets` ADD `carryover` integer DEFAULT false NOT NULL;

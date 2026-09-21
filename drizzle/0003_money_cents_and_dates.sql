PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `accounts_stage` (
	`id` text,
	`name` text,
	`balance` integer,
	`account_type` text,
	`closed_at` text,
	`created_at` text
);
--> statement-breakpoint
INSERT INTO `accounts_stage`
SELECT `id`,`name`, CAST(ROUND(COALESCE(`balance`,0) * 100) AS INTEGER), `account_type`, NULL, `created_at`
FROM `accounts`;
--> statement-breakpoint
CREATE TABLE `transactions_stage` (
	`id` text,
	`account_id` text,
	`category_id` text,
	`payment` integer,
	`notes` text,
	`date` text,
	`deposit` integer,
	`source` text,
	`external_hash` text,
	`status` text,
	`transfer_id` text
);
--> statement-breakpoint
INSERT INTO `transactions_stage`
SELECT
  `id`,
  `account_id`,
  `category_id`,
  CASE WHEN `payment` IS NULL THEN NULL ELSE CAST(ROUND(`payment` * 100) AS INTEGER) END,
  `notes`,
  substr(datetime(
    CASE WHEN `date` LIKE '%T%' THEN `date` ELSE replace(`date`, ' ', 'T') || 'Z' END,
    '+5 hours'
  ), 1, 10),
  CASE WHEN `deposit` IS NULL THEN NULL ELSE CAST(ROUND(`deposit` * 100) AS INTEGER) END,
  `source`,
  `external_hash`,
  'cleared',
  NULL
FROM `transactions`;
--> statement-breakpoint
CREATE TABLE `monthly_budgets_stage` (
	`category_id` text,
	`month` text,
	`amount` integer
);
--> statement-breakpoint
INSERT INTO `monthly_budgets_stage`
SELECT `category_id`,`month`, CAST(ROUND(COALESCE(`amount`,0) * 100) AS INTEGER)
FROM `monthly_budgets`;
--> statement-breakpoint
DROP TABLE `transactions`;
--> statement-breakpoint
DROP TABLE `monthly_budgets`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`account_type` text DEFAULT 'on_budget' NOT NULL,
	`closed_at` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `accounts` SELECT * FROM `accounts_stage`;
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text,
	`category_id` text,
	`payment` integer,
	`notes` text,
	`date` text NOT NULL,
	`deposit` integer,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_hash` text,
	`status` text DEFAULT 'cleared' NOT NULL,
	`transfer_id` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `transactions` SELECT * FROM `transactions_stage`;
--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`date`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_category_date` ON `transactions` (`category_id`,`date`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_status` ON `transactions` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_transfer` ON `transactions` (`transfer_id`);
--> statement-breakpoint
CREATE INDEX `idx_transactions_source` ON `transactions` (`source`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transactions_external_hash` ON `transactions` (`external_hash`);
--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`category_id`, `month`),
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `monthly_budgets` SELECT * FROM `monthly_budgets_stage`;
--> statement-breakpoint
CREATE INDEX `idx_monthly_budgets_month_category` ON `monthly_budgets` (`month`,`category_id`);
--> statement-breakpoint
DROP TABLE `accounts_stage`;
--> statement-breakpoint
DROP TABLE `transactions_stage`;
--> statement-breakpoint
DROP TABLE `monthly_budgets_stage`;
--> statement-breakpoint
ALTER TABLE `bank_sender_configs` ADD `account_id` text;
--> statement-breakpoint
UPDATE `bank_sender_configs`
SET `account_id` = (SELECT `id` FROM `accounts` WHERE `accounts`.`name` = `bank_sender_configs`.`account_name`)
WHERE `account_id` IS NULL;

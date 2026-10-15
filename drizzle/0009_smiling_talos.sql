ALTER TABLE `gmail_messages` ADD `ai_parse` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bank_sender_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_email` text NOT NULL,
	`account_name` text NOT NULL,
	`account_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_bank_sender_configs`("id", "sender_email", "account_name", "account_id", "enabled", "created_at") SELECT "id", "sender_email", "account_name", "account_id", "enabled", "created_at" FROM `bank_sender_configs`;--> statement-breakpoint
DROP TABLE `bank_sender_configs`;--> statement-breakpoint
ALTER TABLE `__new_bank_sender_configs` RENAME TO `bank_sender_configs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `bank_sender_configs_sender_email_unique` ON `bank_sender_configs` (`sender_email`);--> statement-breakpoint
CREATE INDEX `idx_bank_sender_configs_enabled` ON `bank_sender_configs` (`enabled`);
CREATE TABLE `bank_sender_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_email` text NOT NULL,
	`account_name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_sender_configs_sender_email_unique` ON `bank_sender_configs` (`sender_email`);--> statement-breakpoint
CREATE INDEX `idx_bank_sender_configs_enabled` ON `bank_sender_configs` (`enabled`);
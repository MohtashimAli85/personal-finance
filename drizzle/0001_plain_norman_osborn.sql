CREATE TABLE `gmail_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text,
	`history_id` text,
	`from` text,
	`subject` text,
	`date` text,
	`internal_date` text,
	`snippet` text,
	`body_text` text,
	`received_at` text DEFAULT (datetime('now')),
	`processed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_gmail_messages_internal_date` ON `gmail_messages` (`internal_date`);--> statement-breakpoint
CREATE TABLE `gmail_sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`history_id` text,
	`updated_at` text DEFAULT (datetime('now'))
);

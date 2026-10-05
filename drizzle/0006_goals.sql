CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`target_month` text,
	`category_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`achieved_at` text,
	`archived_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goals_category_id_unique` ON `goals` (`category_id`);

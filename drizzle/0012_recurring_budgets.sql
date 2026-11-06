ALTER TABLE `budget_months` ADD `recurring_filled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `recurring_amount` integer;
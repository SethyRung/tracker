-- Rename existing recurring_type values to the new enum
-- (none -> unlimited, fixed -> recurring, variable -> unlimited).
UPDATE "categories" SET "recurring_type" = 'unlimited' WHERE "recurring_type" = 'none';
UPDATE "categories" SET "recurring_type" = 'recurring' WHERE "recurring_type" = 'fixed';
UPDATE "categories" SET "recurring_type" = 'unlimited' WHERE "recurring_type" = 'variable';
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "recurring_type" SET DEFAULT 'unlimited';
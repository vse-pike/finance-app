CREATE TABLE "recurring_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" text NOT NULL,
	"day_of_month" integer NOT NULL,
	"qty_delta" numeric(38, 12) NOT NULL,
	"value_native" numeric(38, 12),
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_run_on" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_rule_asset_idx" ON "recurring_rule" USING btree ("asset_id");
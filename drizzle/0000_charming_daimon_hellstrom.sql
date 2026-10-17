CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"unit" text NOT NULL,
	"quote_currency" text NOT NULL,
	"valuation" text DEFAULT 'market' NOT NULL,
	"opened_on" date DEFAULT now() NOT NULL,
	"closed_on" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "operation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"qty_delta" numeric(38, 12) NOT NULL,
	"value_native" numeric(38, 12),
	"note" text
);
--> statement-breakpoint
CREATE TABLE "price" (
	"unit" text NOT NULL,
	"in_unit" text NOT NULL,
	"on_date" date NOT NULL,
	"rate" numeric(38, 12) NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "price_pk" PRIMARY KEY("unit","in_unit","on_date")
);
--> statement-breakpoint
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
CREATE TABLE "revaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"on_date" date NOT NULL,
	"price_native" numeric(38, 12) NOT NULL,
	"kind" text DEFAULT 'capital' NOT NULL,
	"source" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot" (
	"asset_id" uuid NOT NULL,
	"on_date" date NOT NULL,
	"qty" numeric(38, 12) NOT NULL,
	"price_native" numeric(38, 12) NOT NULL,
	"value_native" numeric(38, 12) NOT NULL,
	"invested_amount" numeric(38, 12),
	"value_usd" numeric(38, 12) NOT NULL,
	"fx_path" jsonb,
	CONSTRAINT "snapshot_pk" PRIMARY KEY("asset_id","on_date")
);
--> statement-breakpoint
ALTER TABLE "operation" ADD CONSTRAINT "operation_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revaluation" ADD CONSTRAINT "revaluation_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operation_asset_ts_idx" ON "operation" USING btree ("asset_id","ts");--> statement-breakpoint
CREATE INDEX "recurring_rule_asset_idx" ON "recurring_rule" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "revaluation_asset_date_idx" ON "revaluation" USING btree ("asset_id","on_date");
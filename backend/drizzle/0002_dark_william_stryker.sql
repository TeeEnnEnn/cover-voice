CREATE TABLE "block" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "block_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "letter_block_versions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter_id" text NOT NULL,
	"block_id" text NOT NULL,
	"captured_updated_at" timestamp NOT NULL,
	CONSTRAINT "letter_block_versions_letter_id_block_id_unique" UNIQUE("letter_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "letter" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"title" text NOT NULL,
	"raw_content" jsonb,
	"generated_content" text,
	CONSTRAINT "letter_user_id_title_unique" UNIQUE("user_id","title")
);
--> statement-breakpoint
CREATE TABLE "letter_variable_versions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter_id" text NOT NULL,
	"variable_id" text NOT NULL,
	"captured_updated_at" timestamp NOT NULL,
	CONSTRAINT "letter_variable_versions_letter_id_variable_id_unique" UNIQUE("letter_id","variable_id")
);
--> statement-breakpoint
CREATE TABLE "variable" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "variable_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
DROP TABLE "items" CASCADE;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block_versions" ADD CONSTRAINT "letter_block_versions_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter" ADD CONSTRAINT "letter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable_versions" ADD CONSTRAINT "letter_variable_versions_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable" ADD CONSTRAINT "variable_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_userId_idx" ON "block" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_block_versions_blockId_idx" ON "letter_block_versions" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "letter_userId_idx" ON "letter" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_variable_versions_variableId_idx" ON "letter_variable_versions" USING btree ("variable_id");--> statement-breakpoint
CREATE INDEX "variable_userId_idx" ON "variable" USING btree ("user_id");
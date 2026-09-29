CREATE TABLE "block_variable" (
	"block_id" text NOT NULL,
	"variable_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "block_variable_block_id_variable_id_pk" PRIMARY KEY("block_id","variable_id")
);
--> statement-breakpoint
CREATE TABLE "letter_block" (
	"letter_id" text NOT NULL,
	"block_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "letter_block_letter_id_block_id_pk" PRIMARY KEY("letter_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "letter_variable" (
	"letter_id" text NOT NULL,
	"variable_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "letter_variable_letter_id_variable_id_pk" PRIMARY KEY("letter_id","variable_id")
);
--> statement-breakpoint
ALTER TABLE "block_variable" ADD CONSTRAINT "block_variable_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variable" ADD CONSTRAINT "block_variable_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variable" ADD CONSTRAINT "block_variable_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block" ADD CONSTRAINT "letter_block_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block" ADD CONSTRAINT "letter_block_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block" ADD CONSTRAINT "letter_block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable" ADD CONSTRAINT "letter_variable_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable" ADD CONSTRAINT "letter_variable_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable" ADD CONSTRAINT "letter_variable_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_variable_block_idx" ON "block_variable" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "block_variable_variable_idx" ON "block_variable" USING btree ("variable_id");--> statement-breakpoint
CREATE INDEX "block_variable_user_idx" ON "block_variable" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_block_letter_idx" ON "letter_block" USING btree ("letter_id");--> statement-breakpoint
CREATE INDEX "letter_block_block_idx" ON "letter_block" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "letter_block_user_idx" ON "letter_block" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_variable_letter_idx" ON "letter_variable" USING btree ("letter_id");--> statement-breakpoint
CREATE INDEX "letter_variable_variable_idx" ON "letter_variable" USING btree ("variable_id");--> statement-breakpoint
CREATE INDEX "letter_variable_user_idx" ON "letter_variable" USING btree ("user_id");
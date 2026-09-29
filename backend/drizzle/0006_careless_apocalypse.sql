ALTER TABLE "block_variable" DROP CONSTRAINT "block_variable_block_id_block_id_fk";
--> statement-breakpoint
ALTER TABLE "block_variable" DROP CONSTRAINT "block_variable_variable_id_variable_id_fk";
--> statement-breakpoint
ALTER TABLE "letter_block" DROP CONSTRAINT "letter_block_letter_id_letter_id_fk";
--> statement-breakpoint
ALTER TABLE "letter_block" DROP CONSTRAINT "letter_block_block_id_block_id_fk";
--> statement-breakpoint
ALTER TABLE "letter_variable" DROP CONSTRAINT "letter_variable_letter_id_letter_id_fk";
--> statement-breakpoint
ALTER TABLE "letter_variable" DROP CONSTRAINT "letter_variable_variable_id_variable_id_fk";
--> statement-breakpoint
ALTER TABLE "block_variable" ADD CONSTRAINT "block_variable_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variable" ADD CONSTRAINT "block_variable_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block" ADD CONSTRAINT "letter_block_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_block" ADD CONSTRAINT "letter_block_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable" ADD CONSTRAINT "letter_variable_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable" ADD CONSTRAINT "letter_variable_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE restrict ON UPDATE no action;
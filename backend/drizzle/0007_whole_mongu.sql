CREATE TABLE "letter_variable_override" (
	"letter_id" text NOT NULL,
	"variable_id" text NOT NULL,
	"user_id" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "letter_variable_override_letter_id_variable_id_pk" PRIMARY KEY("letter_id","variable_id")
);
--> statement-breakpoint
ALTER TABLE "letter_variable_override" ADD CONSTRAINT "letter_variable_override_letter_id_letter_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable_override" ADD CONSTRAINT "letter_variable_override_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_variable_override" ADD CONSTRAINT "letter_variable_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "letter_variable_override_letter_idx" ON "letter_variable_override" USING btree ("letter_id");--> statement-breakpoint
CREATE INDEX "letter_variable_override_variable_idx" ON "letter_variable_override" USING btree ("variable_id");--> statement-breakpoint
CREATE INDEX "letter_variable_override_user_idx" ON "letter_variable_override" USING btree ("user_id");
ALTER TABLE "letter" ALTER COLUMN "generated_content" SET DATA TYPE jsonb USING "generated_content"::jsonb;

CREATE TYPE "public"."session_kind" AS ENUM('Qualifying', 'Race');--> statement-breakpoint
CREATE TABLE "regular_driver" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "regular_driver_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season" integer NOT NULL,
	"driver_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "regular_driver_season_driver_id_unique" UNIQUE("season","driver_id")
);
--> statement-breakpoint
CREATE TABLE "round" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "round_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season" integer NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "round_season_number_unique" UNIQUE("season","number")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"round_id" integer NOT NULL,
	"kind" "session_kind" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"locks_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_round_id_kind_unique" UNIQUE("round_id","kind")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "league" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "league_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"player_id" text NOT NULL,
	"league_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_player_id_league_id_pk" PRIMARY KEY("player_id","league_id")
);
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;
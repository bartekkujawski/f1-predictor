CREATE TABLE "prediction" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prediction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"player_id" text NOT NULL,
	"session_id" integer NOT NULL,
	"picks" text[] NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "prediction_player_id_session_id_unique" UNIQUE("player_id","session_id"),
	CONSTRAINT "prediction_ten_picks" CHECK (cardinality("prediction"."picks") = 10)
);
--> statement-breakpoint
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watcher_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sighting_id" uuid,
	"channel" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"phone" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"pet_id" uuid,
	"sighting_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "text_reports_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"radius_m" integer NOT NULL,
	"token_hash" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "found_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "text_code" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "alert_neighbors" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "flyer_scans" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_watcher_id_watchers_id_fk" FOREIGN KEY ("watcher_id") REFERENCES "public"."watchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_reports" ADD CONSTRAINT "text_reports_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_watcher_idx" ON "alerts" USING btree ("watcher_id","sent_at");--> statement-breakpoint
CREATE INDEX "alerts_pet_idx" ON "alerts" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "watchers_point_idx" ON "watchers" USING btree ("lat","lng");--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_text_code_unique" UNIQUE("text_code");
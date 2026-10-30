CREATE TABLE "pet_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"last_lat" double precision NOT NULL,
	"last_lng" double precision NOT NULL,
	"owner_email" text NOT NULL,
	"edit_token_hash" text NOT NULL,
	"status" text DEFAULT 'lost' NOT NULL,
	"found_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "sightings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"reporter_contact" text,
	"ip_hash" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_photos_pet_idx" ON "pet_photos" USING btree ("pet_id","position");--> statement-breakpoint
CREATE INDEX "sightings_pet_idx" ON "sightings" USING btree ("pet_id","seen_at");
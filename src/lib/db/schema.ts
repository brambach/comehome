import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const SPECIES = ["dog", "cat", "other"] as const;
export type Species = (typeof SPECIES)[number];

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  species: text("species", { enum: SPECIES }).notNull(),
  description: text("description").notNull().default(""),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  lastLat: doublePrecision("last_lat").notNull(),
  lastLng: doublePrecision("last_lng").notNull(),
  // Private: never selected by public queries (see src/lib/public.ts).
  ownerEmail: text("owner_email").notNull(),
  editTokenHash: text("edit_token_hash").notNull(),
  status: text("status", { enum: ["lost", "found"] }).notNull().default("lost"),
  foundAt: timestamp("found_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const petPhotos = pgTable(
  "pet_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("pet_photos_pet_idx").on(t.petId, t.position)],
);

export const sightings = pgTable(
  "sightings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
    note: text("note").notNull().default(""),
    photoUrl: text("photo_url"),
    // Private: shown to the owner only.
    reporterContact: text("reporter_contact"),
    ipHash: text("ip_hash"),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sightings_pet_idx").on(t.petId, t.seenAt)],
);

/** Fixed-window counters for rate limiting, keyed by action and hashed IP. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type Pet = typeof pets.$inferSelect;
export type Sighting = typeof sightings.$inferSelect;

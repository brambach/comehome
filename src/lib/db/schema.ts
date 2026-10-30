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
  /** The owner's few lines on how they came home. Public once found. */
  foundNote: text("found_note").notNull().default(""),
  /** Short word printed on the flyer for text-to-report, e.g. "JUNI4". */
  textCode: text("text_code").unique(),
  /** Owner's choice at creation: alert opted-in neighbors near the last-seen point. */
  alertNeighbors: boolean("alert_neighbors").notNull().default(true),
  /** Times the flyer's QR code was opened. A weak signal: someone there cared enough to look. */
  flyerScans: integer("flyer_scans").notNull().default(0),
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

/**
 * Neighbors who asked to hear about lost pets near home. Private: never read
 * by public pages. A row does nothing until `confirmedAt` is set from the
 * emailed link, and every alert carries the token that stops them.
 */
export const watchers = pgTable(
  "watchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    /** E.164. Only set when they ticked the text-message consent box. */
    phone: text("phone"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    radiusM: integer("radius_m").notNull(),
    tokenHash: text("token_hash").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("watchers_point_idx").on(t.lat, t.lng)],
);

/** Every alert sent, so nobody hears about the same pet twice in a day. */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watcherId: uuid("watcher_id")
      .notNull()
      .references(() => watchers.id, { onDelete: "cascade" }),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["missing", "nearby", "found"] }).notNull(),
    sightingId: uuid("sighting_id"),
    channel: text("channel", { enum: ["email", "sms"] }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alerts_watcher_idx").on(t.watcherId, t.sentAt), index("alerts_pet_idx").on(t.petId)],
);

/**
 * A sighting that arrived as a text message. Texts don't carry a location,
 * so the reply links to /r/[token], where the reporter drops the pin with
 * their photo already attached. Private: the phone number reaches the owner only.
 */
export const textReports = pgTable("text_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  phone: text("phone").notNull(),
  body: text("body").notNull().default(""),
  photoUrl: text("photo_url"),
  petId: uuid("pet_id").references(() => pets.id, { onDelete: "cascade" }),
  sightingId: uuid("sighting_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
export type Watcher = typeof watchers.$inferSelect;
export type TextReport = typeof textReports.$inferSelect;

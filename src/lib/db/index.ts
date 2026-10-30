import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// One pool per process; dev hot reloads reuse it instead of leaking connections.
const globalForDb = globalThis as unknown as { __comehomeDb?: Db; __comehomeSql?: postgres.Sql };

export function db(): Db {
  if (!globalForDb.__comehomeDb && isDemo()) {
    // The live demo: Postgres compiled to WASM, in memory, seeded on boot by
    // src/instrumentation.ts. Same SQL, same Drizzle queries, nothing to host.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    globalForDb.__comehomeDb = drizzlePglite(new PGlite(), { schema }) as unknown as Db;
  }
  if (!globalForDb.__comehomeDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
    const client = postgres(url, { max: 5, prepare: false });
    globalForDb.__comehomeSql = client;
    globalForDb.__comehomeDb = drizzle(client, { schema });
  }
  return globalForDb.__comehomeDb;
}

export async function closeDb() {
  await globalForDb.__comehomeSql?.end();
  globalForDb.__comehomeDb = undefined;
  globalForDb.__comehomeSql = undefined;
}

/** DEMO=1 runs the whole app on an in-memory database with made-up pets. */
export function isDemo(): boolean {
  return process.env.DEMO === "1";
}

export { schema };

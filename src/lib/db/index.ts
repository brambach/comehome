import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// One pool per process; dev hot reloads reuse it instead of leaking connections.
const globalForDb = globalThis as unknown as { __comehomeDb?: Db; __comehomeSql?: postgres.Sql };

export function db(): Db {
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

export { schema };

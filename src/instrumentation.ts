/**
 * Runs once per server instance, before any request. In the live demo it
 * creates the in-memory database and fills it with the demo town.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DEMO !== "1") return;
  const path = await import("node:path");
  const { db } = await import("@/lib/db");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { seedDemo } = await import("@/lib/demo/seed");
  const database = db();
  await migrate(database as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedDemo(database);
}

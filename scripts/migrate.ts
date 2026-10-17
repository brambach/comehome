import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "../src/lib/db";

async function main() {
  await migrate(db(), { migrationsFolder: "drizzle" });
  console.log("migrations applied");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Demo data: Juniper lost by Burnt Cedar Beach with 8 sightings drifting
 * east through Incline Village, Pepper in Kings Beach, and Mochi, who's home.
 * Re-running replaces them. Prints Juniper's public and edit links.
 */
import "dotenv/config";
import { closeDb, db } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo/seed";
import { editUrl } from "../src/lib/notify";
import { petUrl } from "../src/lib/site";

async function main() {
  const { juniper, token } = await seedDemo(db());
  console.log("Seeded Juniper (8 sightings, 1 hidden), Pepper and Mochi, plus 41 demo neighbors.");
  console.log(`Public: ${petUrl(juniper.slug)}`);
  console.log(`Edit:   ${editUrl(juniper.slug, token)}`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

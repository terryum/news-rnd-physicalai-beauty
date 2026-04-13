/**
 * Slow crawl — Group E (Playwright required).
 * Merges results with existing items.json from fast crawl.
 * Run: npx tsx scripts/crawl-slow.ts
 */
import { crawl } from "../worker/crawl";

crawl("slow")
  .then(() => {
    console.log(`\n--- Slow crawl complete ---`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Slow crawl failed:", err);
    process.exit(1);
  });

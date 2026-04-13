/**
 * Fast crawl — Groups A, B, C, D only (no Playwright).
 * Run: npx tsx scripts/crawl-fast.ts
 */
import { crawl } from "../worker/crawl";

crawl("fast")
  .then(() => {
    console.log(`\n--- Fast crawl complete ---`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fast crawl failed:", err);
    process.exit(1);
  });

import { promises as fs } from "fs";
import path from "path";
import type { Item } from "@/data/types";
import { seedItems } from "@/data/seed-items";

export async function loadItems(): Promise<{
  items: Item[];
  source: "crawled" | "seed";
  lastUpdated: string | null;
}> {
  const dataPath = path.join(process.cwd(), "public/data/items.json");

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const parsed = JSON.parse(raw) as Item[];

    if (parsed.length > 0) {
      const stat = await fs.stat(dataPath);
      return {
        items: parsed,
        source: "crawled",
        lastUpdated: stat.mtime.toISOString(),
      };
    }
  } catch {
    // file doesn't exist or is invalid — fall through to seed
  }

  return {
    items: seedItems,
    source: "seed",
    lastUpdated: null,
  };
}

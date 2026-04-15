import { DigestHome } from "@/components/digest-home";
import { loadItems } from "@/lib/load-items";

export const dynamic = "force-static";
export const revalidate = false;

export default async function Home() {
  const { items, lastUpdated } = await loadItems();

  return <DigestHome items={items} lastUpdated={lastUpdated} />;
}

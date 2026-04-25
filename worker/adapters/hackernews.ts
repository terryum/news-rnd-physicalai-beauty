import { CrawlerAdapter } from "./interface";
import { RawItem, SourceConfig } from "../types";

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;
const MIN_POINTS = 50;
const HITS_PER_PAGE = 50;

/**
 * Hacker News (Algolia search) — 키워드별 쿼리 후 dedup.
 * Algolia의 query 필드는 OR 연산자를 지원하지 않으므로 키워드마다 호출한다.
 * 최근 7일 + 점수 임계값 필터.
 */
export const hackernewsAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const keywords = (config.keywords as string[] | undefined) ?? [];
    if (keywords.length === 0) {
      console.log(`[${config.id}] keywords 없음 — 스킵`);
      return [];
    }

    const sinceTs = Math.floor(Date.now() / 1000) - SEVEN_DAYS_S;
    const seen = new Set<string>();
    const items: RawItem[] = [];

    for (const kw of keywords) {
      const url = new URL("https://hn.algolia.com/api/v1/search");
      url.searchParams.set("query", kw);
      url.searchParams.set("tags", "story");
      url.searchParams.set("hitsPerPage", String(HITS_PER_PAGE));
      url.searchParams.set(
        "numericFilters",
        `created_at_i>${sinceTs},points>=${MIN_POINTS}`,
      );

      try {
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.log(`[${config.id}] HN "${kw}" ${res.status}`);
          continue;
        }
        const data = (await res.json()) as AlgoliaResponse;

        for (const hit of data.hits ?? []) {
          if (seen.has(hit.objectID)) continue;
          seen.add(hit.objectID);
          const title = hit.title ?? hit.story_title;
          const link = hit.url ?? hit.story_url;
          if (!title || !link) continue;
          items.push({
            sourceId: config.id,
            title,
            url: link,
            publishedAt: hit.created_at,
            points: hit.points ?? 0,
            commentCount: hit.num_comments ?? 0,
            lang: "en",
          });
        }
      } catch (err) {
        console.log(`[${config.id}] HN "${kw}" 에러:`, (err as Error).message);
      }
    }

    console.log(`[${config.id}] HN → ${items.length}건 (points>=${MIN_POINTS}, ${keywords.length}개 키워드)`);
    return items;
  },
};

import { CrawlerAdapter } from "./interface";
import { RawItem, SourceConfig } from "../types";

/**
 * 그룹 A: 네이버 뉴스 검색 API 어댑터
 * - 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * - config.keywords 각각에 대해 검색하고 결과를 합친다
 */
export const naverNewsAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log(`[${config.id}] NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수 미설정 — 스킵`);
      return [];
    }

    const keywords = (config.keywords as string[]) ?? [];
    if (keywords.length === 0) {
      console.log(`[${config.id}] 키워드가 없습니다 — 스킵`);
      return [];
    }

    const allItems: RawItem[] = [];
    const seenUrls = new Set<string>();

    for (const keyword of keywords) {
      try {
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=100&sort=date`;
        const res = await fetch(url, {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
        });

        if (!res.ok) {
          console.log(`[${config.id}] 키워드="${keyword}" HTTP ${res.status} — 스킵`);
          continue;
        }

        const data = (await res.json()) as {
          items: Array<{
            title: string;
            originallink: string;
            link: string;
            description: string;
            pubDate: string;
          }>;
        };

        for (const item of data.items ?? []) {
          const itemUrl = item.originallink || item.link;
          if (seenUrls.has(itemUrl)) continue;
          seenUrls.add(itemUrl);

          allItems.push({
            sourceId: config.id,
            title: stripHtml(item.title),
            url: itemUrl,
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
            description: stripHtml(item.description),
          });
        }

        console.log(`[${config.id}] 키워드="${keyword}" → ${data.items?.length ?? 0}건`);
      } catch (err) {
        console.log(`[${config.id}] 키워드="${keyword}" 에러:`, (err as Error).message);
      }
    }

    return allItems;
  },
};

/** 네이버 API 응답에 포함된 HTML 태그 제거 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

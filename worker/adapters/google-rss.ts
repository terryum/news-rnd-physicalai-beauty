import RssParser from "rss-parser";
import { CrawlerAdapter } from "./interface";
import { RawItem, SourceConfig } from "../types";

const parser = new RssParser();

/**
 * 그룹 B: 구글 뉴스 RSS 어댑터
 * - rss-parser로 RSS 파싱
 * - Google 리다이렉트 URL에서 실제 URL 추출
 */
export const googleRssAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const items: RawItem[] = [];

    try {
      const feed = await parser.parseURL(config.url);

      for (const entry of feed.items ?? []) {
        const realUrl = extractRealUrl(entry.link ?? "");
        items.push({
          sourceId: config.id,
          title: entry.title ?? "(제목 없음)",
          url: realUrl,
          publishedAt: entry.pubDate ? new Date(entry.pubDate).toISOString() : undefined,
          description: entry.contentSnippet ?? entry.content ?? undefined,
        });
      }

      console.log(`[${config.id}] RSS → ${items.length}건`);
    } catch (err) {
      console.log(`[${config.id}] RSS 파싱 에러:`, (err as Error).message);
    }

    return items;
  },
};

/**
 * Google News 리다이렉트 URL에서 실제 URL을 추출한다.
 * 예: https://news.google.com/rss/articles/CBMi...?oc=5
 * Google RSS는 두 가지 형태가 있다:
 * 1) URL 파라미터에 원본 URL이 포함된 경우 → url= 파라미터 추출
 * 2) Base64 인코딩된 경우 → 그대로 반환 (디코딩은 복잡하므로)
 */
function extractRealUrl(googleUrl: string): string {
  if (!googleUrl) return googleUrl;

  try {
    const parsed = new URL(googleUrl);

    // url 파라미터가 있으면 그것이 실제 URL
    const urlParam = parsed.searchParams.get("url");
    if (urlParam) return urlParam;

    // Google News article redirect 형태인 경우 그대로 반환
    // (실제 디코딩은 Google의 인코딩 방식이 복잡하여 생략)
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

import * as cheerio from "cheerio";
import { CrawlerAdapter } from "./interface";
import { RawItem, SourceConfig } from "../types";

/**
 * 그룹 C: 나무엔미디어 CMS 공통 어댑터
 * - 로봇신문, 코스인코리아, CMN, 코스모닝, 뷰티누리, 장업신문
 * - 모두 동일한 CMS 구조: {baseUrl}/news/articleList.html?sc_word={keyword}&page=1
 * - cheerio로 HTML 파싱하여 기사 목록 추출
 */
export const namuCmsAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const baseUrl = config.url.replace(/\/$/, "");
    const searchPath = (config.search_path as string) ?? "/news/articleList.html";
    const keywords = (config.keywords as string[]) ?? [];

    if (keywords.length === 0) {
      console.log(`[${config.id}] 키워드가 없습니다 — 스킵`);
      return [];
    }

    const allItems: RawItem[] = [];
    const seenUrls = new Set<string>();

    for (const keyword of keywords) {
      try {
        const searchUrl = `${baseUrl}${searchPath}?sc_word=${encodeURIComponent(keyword)}&page=1`;
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!res.ok) {
          console.log(`[${config.id}] 키워드="${keyword}" HTTP ${res.status}`);
          continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        let count = 0;

        // 나무엔미디어 CMS 기사 목록 구조
        // #section-list .article-list-content .list-block
        // 또는 #user-container .list-titles
        const articleSelectors = [
          ".article-list-content .list-block",
          "#section-list .list-block",
          ".list-titles li",
          ".article-list ul li",
          "#user-container .type2 li",
          "section .list-block",
        ];

        let found = false;
        for (const selector of articleSelectors) {
          const elements = $(selector);
          if (elements.length === 0) continue;
          found = true;

          elements.each((_, el) => {
            const $el = $(el);
            // 제목과 링크 추출
            const $a = $el.find("a[href*='article']").first() || $el.find("a").first();
            if (!$a.length) return;

            const href = $a.attr("href") ?? "";
            const title =
              $a.find(".titles").text().trim() ||
              $a.find(".list-titles").text().trim() ||
              $a.text().trim();

            if (!title || !href) return;

            const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
            if (seenUrls.has(fullUrl)) return;
            seenUrls.add(fullUrl);

            // 날짜 추출 시도
            const dateText =
              $el.find(".list-dated").text().trim() ||
              $el.find(".byline em").text().trim() ||
              $el.find(".dated").text().trim() ||
              "";

            const publishedAt = parseKoreanDate(dateText);

            // 섹션 추출
            const section =
              $el.find(".list-section").text().trim() ||
              $el.find(".section").text().trim() ||
              "";

            allItems.push({
              sourceId: config.id,
              title,
              url: fullUrl,
              publishedAt,
              description: section ? `[${section}]` : undefined,
            });
            count++;
          });

          break; // 첫 번째 매칭 셀렉터만 사용
        }

        if (!found) {
          // 대안: 모든 기사 링크 추출
          $('a[href*="/news/articleView"]').each((_, el) => {
            const $a = $(el);
            const href = $a.attr("href") ?? "";
            const title = $a.text().trim();
            if (!title || title.length < 5) return;

            const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
            if (seenUrls.has(fullUrl)) return;
            seenUrls.add(fullUrl);

            allItems.push({
              sourceId: config.id,
              title,
              url: fullUrl,
            });
            count++;
          });
        }

        console.log(`[${config.id}] 키워드="${keyword}" → ${count}건`);
      } catch (err) {
        console.log(`[${config.id}] 키워드="${keyword}" 에러:`, (err as Error).message);
      }
    }

    return allItems;
  },
};

/** 한국어 날짜 문자열 파싱 시도 */
function parseKoreanDate(text: string): string | undefined {
  if (!text) return undefined;

  // "2024.01.15" 또는 "2024-01-15" 형태
  const match = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`).toISOString();
  }

  // "2024년 1월 15일" 형태
  const matchKr = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (matchKr) {
    const [, y, m, d] = matchKr;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`).toISOString();
  }

  return undefined;
}

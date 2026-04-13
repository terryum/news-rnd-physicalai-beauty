/**
 * 그룹 A: 기업마당 API (RSS/XML 형식)
 * endpoint: https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do
 * 인증: crtfcKey 파라미터
 */
import Parser from "rss-parser";
import { CrawlerAdapter } from "./interface";
import { SourceConfig, RawItem } from "../types";

const parser = new Parser();

const BIZINFO_KEYWORDS = [
  "AI", "로봇", "자동화", "스마트팩토리", "스마트공장",
  "제조혁신", "디지털전환", "디지털트윈",
];

export const bizinfoAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const apiKey = process.env.BIZINFO_API_KEY;
    if (!apiKey) {
      console.log(`[${config.id}] BIZINFO_API_KEY 환경변수 미설정 — 스킵`);
      return [];
    }

    const allItems: RawItem[] = [];

    for (const keyword of BIZINFO_KEYWORDS) {
      try {
        const url = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${apiKey}&dataType=rss&searchCnt=30&hashtags=${encodeURIComponent(keyword)}`;
        const feed = await parser.parseURL(url);

        for (const entry of feed.items) {
          if (!entry.title || !entry.link) continue;
          allItems.push({
            sourceId: config.id,
            title: entry.title.trim(),
            url: entry.link.trim(),
            publishedAt: entry.pubDate ?? entry.isoDate,
            description: entry.contentSnippet ?? entry.content,
          });
        }

        console.log(`[${config.id}] 키워드="${keyword}" → ${feed.items.length}건`);
      } catch (err) {
        console.log(`[${config.id}] 키워드="${keyword}" 에러: ${(err as Error).message}`);
      }
    }

    return allItems;
  },
};

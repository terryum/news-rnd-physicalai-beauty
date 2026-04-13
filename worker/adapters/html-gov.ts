import * as cheerio from "cheerio";
import { CrawlerAdapter } from "./interface";
import { RawItem, SourceConfig } from "../types";

/**
 * 그룹 D: 정부 사이트 HTML 파서
 * - 사이트마다 HTML 구조가 다르므로 siteId별 파서 함수를 내부에 매핑
 * - 파싱 실패 시 에러를 기록하되 전체 크롤링은 중단하지 않음
 */
export const htmlGovAdapter: CrawlerAdapter = {
  async fetchItems(config: SourceConfig): Promise<RawItem[]> {
    const listUrl = (config.list_url as string) || (config.search_url as string) || config.url;

    try {
      const res = await fetch(listUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        console.log(`[${config.id}] HTTP ${res.status} — 스킵`);
        return [];
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const baseUrl = config.url.replace(/\/$/, "");

      // siteId별 전용 파서가 있으면 사용, 없으면 범용 파서
      const parser = siteSpecificParsers[config.id];
      if (parser) {
        const items = parser($, baseUrl, config);
        console.log(`[${config.id}] 전용파서 → ${items.length}건`);
        return items;
      }

      // 범용 파서: 테이블 또는 리스트 기반 공고 목록 추출
      const items = genericParser($, baseUrl, config);
      console.log(`[${config.id}] 범용파서 → ${items.length}건`);
      return items;
    } catch (err) {
      console.log(`[${config.id}] 파싱 에러:`, (err as Error).message);
      return [];
    }
  },
};

type SiteParser = (
  $: cheerio.CheerioAPI,
  baseUrl: string,
  config: SourceConfig
) => RawItem[];

/** 사이트별 전용 파서 매핑 */
const siteSpecificParsers: Record<string, SiteParser> = {
  // KIRIA: 로봇산업진흥원 사업공고
  kiria: ($, baseUrl, config) => {
    const items: RawItem[] = [];
    $("table tbody tr").each((_, tr) => {
      const $tr = $(tr);
      const $a = $tr.find("td a").first();
      const title = $a.text().trim();
      const href = $a.attr("href") ?? "";
      const dateText = $tr.find("td").last().text().trim();

      if (!title || !href) return;
      const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
      items.push({
        sourceId: config.id,
        title,
        url,
        publishedAt: parseDateGeneric(dateText),
        agency: config.name,
      });
    });
    return items;
  },

  // SMTECH: 중소기업기술개발사업 공고
  smtech: ($, baseUrl, config) => {
    const items: RawItem[] = [];
    $("table tbody tr, .board-list tbody tr").each((_, tr) => {
      const $tr = $(tr);
      const $a = $tr.find("td a, td .title a").first();
      const title = $a.text().trim();
      const href = $a.attr("href") ?? "";
      const dateCells = $tr.find("td");
      const dateText = dateCells.length >= 4 ? dateCells.eq(3).text().trim() : "";

      if (!title || !href) return;
      const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
      items.push({
        sourceId: config.id,
        title,
        url,
        publishedAt: parseDateGeneric(dateText),
        agency: config.name,
      });
    });
    return items;
  },

  // 과기정통부
  msit: ($, baseUrl, config) => {
    const items: RawItem[] = [];
    $(".board_list tbody tr, .bbs_list tbody tr").each((_, tr) => {
      const $tr = $(tr);
      const $a = $tr.find("td.title a, td a").first();
      const title = $a.text().trim();
      const href = $a.attr("href") ?? "";
      const dateText = $tr.find("td.date, td:nth-child(4)").text().trim();

      if (!title || !href) return;
      const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
      items.push({
        sourceId: config.id,
        title,
        url,
        publishedAt: parseDateGeneric(dateText),
        agency: config.name,
      });
    });
    return items;
  },
};

/** 범용 파서: 테이블 또는 리스트 기반 공고 목록 */
function genericParser(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  config: SourceConfig
): RawItem[] {
  const items: RawItem[] = [];
  const seenUrls = new Set<string>();

  // 전략 1: 테이블 tbody tr
  $("table tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const $a = $tr.find("a").first();
    const title = $a.text().trim();
    const href = $a.attr("href") ?? "";
    if (!title || title.length < 3 || !href) return;

    const url = resolveUrl(href, baseUrl);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    // 날짜: 마지막 td 또는 날짜 패턴이 있는 td
    let dateText = "";
    $tr.find("td").each((_, td) => {
      const t = $(td).text().trim();
      if (/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/.test(t)) {
        dateText = t;
      }
    });

    items.push({
      sourceId: config.id,
      title,
      url,
      publishedAt: parseDateGeneric(dateText),
      agency: config.name,
    });
  });

  // 전략 2: 테이블이 비었으면 리스트 기반
  if (items.length === 0) {
    $(".board_list li, .bbs_list li, .list-item, ul.list > li").each((_, li) => {
      const $li = $(li);
      const $a = $li.find("a").first();
      const title = $a.text().trim();
      const href = $a.attr("href") ?? "";
      if (!title || title.length < 3 || !href) return;

      const url = resolveUrl(href, baseUrl);
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      items.push({
        sourceId: config.id,
        title,
        url,
        agency: config.name,
      });
    });
  }

  return items;
}

function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${baseUrl}${href}`;
  return `${baseUrl}/${href}`;
}

function parseDateGeneric(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    try {
      return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`).toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

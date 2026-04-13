/**
 * 정규화 유틸리티
 * - 제목 정규화
 * - URL 정규화
 * - 날짜 파싱
 */

/** 제목 정규화: 공백/특수문자 제거, 소문자화 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, " ") // 연속 공백 → 단일 공백
    .replace(/[^\p{L}\p{N}\s]/gu, "") // 특수문자 제거 (유니코드 문자/숫자/공백만 유지)
    .toLowerCase()
    .trim();
}

/** URL 정규화: 프로토콜 통일, 쿼리 파라미터 정리 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // http → https로 통일
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    // 트래킹 파라미터 제거
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source",
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // trailing slash 제거
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    // hash 제거
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return url;
  }
}

/** URL에서 도메인 추출 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * 다양한 한국어 날짜 형식을 ISO 문자열로 파싱
 * 지원 형식:
 * - 2024.01.15 / 2024-01-15 / 2024/01/15
 * - 2024년 1월 15일
 * - Jan 15, 2024
 * - ISO 8601
 */
export function parseDate(text: string): string | undefined {
  if (!text || !text.trim()) return undefined;
  const t = text.trim();

  // ISO 형식 이미 맞는 경우
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return t;

  // "2024.01.15" / "2024-01-15" / "2024/01/15"
  const dotMatch = t.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (dotMatch) {
    const [, y, m, d] = dotMatch;
    return safeIso(y, m, d);
  }

  // "2024년 1월 15일"
  const krMatch = t.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (krMatch) {
    const [, y, m, d] = krMatch;
    return safeIso(y, m, d);
  }

  // "1월 15일" (올해로 추정)
  const krShort = t.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (krShort) {
    const year = new Date().getFullYear().toString();
    const [, m, d] = krShort;
    return safeIso(year, m, d);
  }

  // 영문: "Jan 15, 2024" 등은 Date.parse에 위임
  try {
    const d = new Date(t);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // ignore
  }

  return undefined;
}

function safeIso(y: string, m: string, d: string): string | undefined {
  try {
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00+09:00`);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch {
    // ignore
  }
  return undefined;
}

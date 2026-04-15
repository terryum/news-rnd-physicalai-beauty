import { RawItem } from "../types";
import {
  PHYSICAL_AI_DIRECT,
  ROBOT_AUTOMATION,
  MANUFACTURING,
  TIER_COMPANIES,
  PRODUCTION_QUALITY,
  GOV_SUPPORT,
  COSMETICS_MANUFACTURING,
  GYEONGGI_REGION,
  NON_RELEVANT_REGION,
  CONSUMER_AI_MARKETING,
  STOCK_IR,
  POLITICS_NOISE,
  T0_KEYWORDS,
  T1_KEYWORDS,
} from "./keywords";

export type Tier = "T0" | "T1" | "T2" | "T3";
export type Priority = "P0" | "P1" | "P2";

export interface ScoredItem extends RawItem {
  score: number;
  tier: Tier;
  priority: Priority;
  matchedKeywords: string[];
  relatedArticles?: { title: string; url: string; sourceId: string }[];
}

/**
 * RawItem에 대해 스코어링을 수행하고 Tier/Priority를 결정한다.
 */
export function scoreItem(item: RawItem): ScoredItem {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];

  // +30: 제조 피지컬AI 직접 언급
  if (matchesAny(text, PHYSICAL_AI_DIRECT)) {
    score += 30;
    matchedKeywords.push("피지컬AI직접");
  }

  // +20: (로봇 OR 자동화) AND 제조 동시
  if (matchesAny(text, ROBOT_AUTOMATION) && matchesAny(text, MANUFACTURING)) {
    score += 20;
    matchedKeywords.push("로봇+제조");
  }

  // +20: T2/T3 기업 AND (생산/품질/설비/물류/공장)
  if (matchesAny(text, TIER_COMPANIES) && matchesAny(text, PRODUCTION_QUALITY)) {
    score += 20;
    matchedKeywords.push("기업+생산");
  }

  // +25: 정부 실증/보급/지원/국책과제
  if (matchesAny(text, GOV_SUPPORT)) {
    score += 25;
    matchedKeywords.push("정부지원");
  }

  // +15: 화장품 제조 키워드
  if (matchesAny(text, COSMETICS_MANUFACTURING)) {
    score += 15;
    matchedKeywords.push("화장품제조");
  }

  // +10: 경기도 지역
  if (matchesAny(text, GYEONGGI_REGION) || item.region?.includes("경기")) {
    score += 10;
    matchedKeywords.push("경기도");
  }

  // -20: 소비자용 AI / 마케팅
  if (matchesAny(text, CONSUMER_AI_MARKETING)) {
    score -= 20;
    matchedKeywords.push("소비자AI(감점)");
  }

  // -15: 주가/공시/IR 단독
  if (matchesAny(text, STOCK_IR) && !matchesAny(text, MANUFACTURING)) {
    score -= 15;
    matchedKeywords.push("주가IR(감점)");
  }

  // -30: 비관련 지역 (대구, 경북, 부산 등)
  if (matchesAny(text, NON_RELEVANT_REGION) && !matchesAny(text, GYEONGGI_REGION)) {
    score -= 30;
    matchedKeywords.push("비관련지역(감점)");
  }

  // -25: 정치/정책 뉴스 (피지컬AI 언급하지만 실질적 제조 내용 아님)
  if (matchesAny(text, POLITICS_NOISE) && !matchesAny(text, COSMETICS_MANUFACTURING)) {
    score -= 25;
    matchedKeywords.push("정치노이즈(감점)");
  }

  const tier = determineTier(text, score);
  const priority = determinePriority(tier, score);

  return {
    ...item,
    score,
    tier,
    priority,
    matchedKeywords,
  };
}

/** Tier 분류 */
function determineTier(text: string, score: number): Tier {
  // T0: 제조 피지컬AI 직접 관련
  if (matchesAny(text, T0_KEYWORDS)) return "T0";

  // T1: 스마트팩토리/제조자동화 넓은 범위
  if (matchesAny(text, T1_KEYWORDS)) return "T1";

  // T2: 점수가 양수이고 제조/로봇 키워드 포함
  if (score > 0 && (matchesAny(text, MANUFACTURING) || matchesAny(text, ROBOT_AUTOMATION))) {
    return "T2";
  }

  // T3: 나머지
  return "T3";
}

/** Priority 분류 — 엄격 기준 (하루 최대 30개 내외 목표) */
function determinePriority(tier: Tier, score: number): Priority {
  // P0 (필독): 화장품·제조 직결 + 높은 점수만
  // T0(피지컬AI)이면서 score >= 40, 또는 화장품 키워드 포함하며 score >= 35
  if (tier === "T0" && score >= 40) return "P0";
  if (tier === "T1" && score >= 45) return "P0";

  // P1 (참고): 관련성 있는 것들
  if ((tier === "T0" || tier === "T1") && score >= 20) return "P1";
  if (tier === "T2" && score >= 30) return "P1";

  // P2 (관찰): 나머지
  return "P2";
}

/** 텍스트에 키워드 목록 중 하나라도 포함되는지 확인 */
function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

/** 여러 아이템을 일괄 스코어링 */
export function scoreItems(items: RawItem[]): ScoredItem[] {
  return items.map(scoreItem);
}

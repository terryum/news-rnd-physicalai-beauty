import { ScoredItem } from "./scorer";
import { normalizeTitle, normalizeUrl } from "./normalize";

/**
 * 중복 제거 (3단계)
 * 1. 정규화된 제목 완전 일치 → 병합
 * 2. 핵심 주어+키워드 동일 → 유사 기사 그루핑 (같은 사건/인물)
 * 3. URL 도메인 동일 → 병합
 */
export function dedup(items: ScoredItem[]): ScoredItem[] {
  // 1단계: 정규화된 제목으로 그룹핑 (완전 일치)
  const titleGroups = new Map<string, ScoredItem[]>();

  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key) continue;
    const existing = titleGroups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      titleGroups.set(key, [item]);
    }
  }

  // 완전 일치 병합
  const afterExact: ScoredItem[] = [];
  for (const [, group] of titleGroups) {
    afterExact.push(mergeGroup(group));
  }

  // 2단계: 유사 기사 그루핑 (핵심어 기반)
  // 같은 주체(인물/회사) + 같은 토픽의 기사들을 하나로 묶음
  const afterSimilar = groupSimilarArticles(afterExact);

  // 3단계: URL 중복 제거 (relatedArticles 보존)
  const urlMap = new Map<string, ScoredItem>();
  for (const item of afterSimilar) {
    const nUrl = normalizeUrl(item.url);
    const existing = urlMap.get(nUrl);
    if (!existing || item.score > existing.score) {
      if (existing && item.score > existing.score && existing.relatedArticles?.length) {
        item.relatedArticles = item.relatedArticles ?? [];
        for (const ra of existing.relatedArticles) {
          if (item.relatedArticles.length < 2) {
            item.relatedArticles.push(ra);
          }
        }
      }
      urlMap.set(nUrl, item);
    }
  }

  return Array.from(urlMap.values());
}

/**
 * 유사 기사 그루핑
 * 제목에서 핵심 주체(인물명/기업명)와 핵심 토픽을 추출하고,
 * 동일 주체+토픽 조합의 기사들은 점수가 가장 높은 1건만 남김.
 */
function groupSimilarArticles(items: ScoredItem[]): ScoredItem[] {
  // 핵심 주체 키워드 (같은 사건에 대한 중복 기사를 그루핑)
  const entityPatterns = [
    "정의선", "현대차", "현대자동차",
    "엔비디아", "nvidia", "젠슨황",
    "삼성전자", "LG전자", "SK",
    "테슬라", "tesla", "일론머스크",
    "보스턴다이나믹스", "figure", "1x",
    "코스맥스", "한국콜마", "아모레퍼시픽", "LG생활건강", "코스메카",
    "구글", "google", "딥마인드",
    "오픈ai", "openai", "앤쓰로픽", "anthropic",
  ];

  // 토픽 키워드
  const topicPatterns = [
    "투자", "인수", "파트너십", "제휴", "MOU",
    "출시", "공개", "발표", "선보",
    "GTC", "CES", "MWC",
    "실적", "매출", "영업이익",
  ];

  // 각 기사에서 주체 기반 그루핑 (주체가 있으면 그룹핑, 토픽 없어도)
  const groupMap = new Map<string, ScoredItem[]>();
  const ungrouped: ScoredItem[] = [];

  for (const item of items) {
    const titleLower = item.title.toLowerCase();
    const entities = entityPatterns.filter((e) => titleLower.includes(e.toLowerCase()));

    if (entities.length > 0) {
      // 주체 기반 그루핑 — 같은 주체의 기사는 같은 그룹으로
      // 발행일이 같은 날(±1일)인 기사끼리만 묶음
      const dateKey = item.publishedAt ? item.publishedAt.slice(0, 10) : "nodate";
      const key = `${entities[0].toLowerCase()}:${dateKey}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    } else {
      ungrouped.push(item);
    }
  }

  const result: ScoredItem[] = [...ungrouped];
  for (const [, group] of groupMap) {
    result.push(mergeGroup(group));
  }

  return result;
}

/** 같은 그룹의 아이템을 하나로 병합 (점수 최고 기준, 관련기사 최대 2개 보존) */
function mergeGroup(group: ScoredItem[]): ScoredItem {
  if (group.length === 1) return group[0];

  group.sort((a, b) => b.score - a.score);
  const parent = { ...group[0] };
  const related: { title: string; url: string; sourceId: string }[] = [];

  for (let i = 1; i < group.length; i++) {
    const child = group[i];
    if (!parent.publishedAt && child.publishedAt) parent.publishedAt = child.publishedAt;
    if (!parent.budgetKrwOk && child.budgetKrwOk) parent.budgetKrwOk = child.budgetKrwOk;
    if (!parent.deadlineAt && child.deadlineAt) parent.deadlineAt = child.deadlineAt;
    if (!parent.description && child.description) parent.description = child.description;
    if (!parent.region && child.region) parent.region = child.region;
    const childKeywords = child.matchedKeywords ?? [];
    for (const kw of childKeywords) {
      if (!parent.matchedKeywords.includes(kw)) parent.matchedKeywords.push(kw);
    }
    // 관련 기사로 보존 (URL이 다른 것만, 최대 2개)
    if (related.length < 2 && child.url !== parent.url) {
      related.push({ title: child.title, url: child.url, sourceId: child.sourceId });
    }
  }

  if (related.length > 0) {
    parent.relatedArticles = related;
  }

  return parent;
}

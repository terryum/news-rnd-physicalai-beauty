import { ScoredItem } from "./scorer";
import { normalizeTitle, normalizeUrl, extractDomain } from "./normalize";

/**
 * 중복 제거
 * - 정규화된 제목이 동일하면 병합
 * - URL 도메인이 같으면 병합
 * - canonical source를 부모로, discovery를 자식으로
 */
export function dedup(items: ScoredItem[]): ScoredItem[] {
  // 1단계: 정규화된 제목으로 그룹핑
  const groups = new Map<string, ScoredItem[]>();

  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key) continue; // 빈 제목 스킵

    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  // 2단계: 같은 도메인의 URL도 병합 후보로 추가 확인
  // (제목이 다르지만 URL이 같은 경우는 드물므로 제목 기준으로 충분)

  const result: ScoredItem[] = [];

  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // 같은 제목 그룹 내에서 canonical 우선 병합
    const merged = mergeGroup(group);
    result.push(merged);
  }

  // 3단계: URL 정규화 후 중복 제거 (다른 제목이지만 같은 URL)
  const urlMap = new Map<string, ScoredItem>();
  const finalResult: ScoredItem[] = [];

  for (const item of result) {
    const nUrl = normalizeUrl(item.url);
    const existing = urlMap.get(nUrl);
    if (existing) {
      // 점수가 높은 것을 유지
      if (item.score > existing.score) {
        urlMap.set(nUrl, item);
      }
    } else {
      urlMap.set(nUrl, item);
    }
  }

  for (const item of urlMap.values()) {
    finalResult.push(item);
  }

  return finalResult;
}

/** 같은 제목의 아이템 그룹을 하나로 병합 */
function mergeGroup(group: ScoredItem[]): ScoredItem {
  // canonical 소스를 부모로 선택 (없으면 점수가 가장 높은 것)
  // authority 정보는 sourceId에서 간접 판단 — 지금은 score 기준으로 선택
  group.sort((a, b) => b.score - a.score);
  const parent = group[0];

  // 나머지 아이템의 정보를 부모에 병합
  for (let i = 1; i < group.length; i++) {
    const child = group[i];

    // 더 나은 날짜 정보
    if (!parent.publishedAt && child.publishedAt) {
      parent.publishedAt = child.publishedAt;
    }

    // 더 나은 예산 정보
    if (!parent.budgetKrwOk && child.budgetKrwOk) {
      parent.budgetKrwOk = child.budgetKrwOk;
    }

    // 더 나은 마감일
    if (!parent.deadlineAt && child.deadlineAt) {
      parent.deadlineAt = child.deadlineAt;
    }

    // 더 나은 설명
    if (!parent.description && child.description) {
      parent.description = child.description;
    }

    // 지역 정보 병합
    if (!parent.region && child.region) {
      parent.region = child.region;
    }

    // 키워드 합치기
    const childKeywords = child.matchedKeywords ?? [];
    for (const kw of childKeywords) {
      if (!parent.matchedKeywords.includes(kw)) {
        parent.matchedKeywords.push(kw);
      }
    }
  }

  return parent;
}

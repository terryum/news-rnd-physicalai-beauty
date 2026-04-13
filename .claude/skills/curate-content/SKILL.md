---
name: curate-content
description: "크롤링된 항목의 분류, 스코어링, 중복 제거를 수행하는 스킬. T/P 분류 규칙, 키워드 매칭, 중복 병합, 스코어 조정 관련 작업에 이 스킬 사용. '분류', '스코어', '중복', '키워드', '필터링', '큐레이션', '정렬', '우선순위', '토픽', '주제 분류', 'P0', 'P1', 'T0', 'T1', '가중치', '병합', 'dedup', 'scoring', 'ranking' 키워드 시 트리거."
---

# Curate Content

크롤링된 RawItem을 분류·스코어링·중복 제거하여 최종 Item 목록을 생성하는 큐레이션 스킬.

## 에이전트

이 스킬은 `content-curator` 에이전트가 수행한다. 에이전트 정의: `.claude/agents/content-curator.md`

## T(주제) 분류 규칙 (PRD S2.1)

### T0 — 핵심
화장품 제조와 피지컬AI가 직접 결합된 항목.

**판정 조건** (OR):
- `core` 키워드 2개 이상 AND `industry` 키워드 1개 이상 포함
- 제목에 "화장품" + ("로봇" | "AI" | "자동화") 동시 포함
- 소스가 화장품 제조 전문 매체

**core 키워드 예시**: 로봇, 자동화, 피지컬AI, physical AI, 매니퓰레이션, 휴머노이드, 디지털트윈, 스마트팩토리, 비전검사, 협동로봇, cobot

**industry 키워드 예시**: 화장품, 코스맥스, OEM, ODM, 뷰티테크, 스킨케어, 메이크업, 충진, 포장, GMP

### T1 — 관련
제조 피지컬AI에 간접 관련되거나 화장품 산업 전반 뉴스.

**판정 조건** (OR):
- `core` 키워드 1개 이상 포함 (T0 미충족)
- `industry` 키워드 2개 이상 포함
- 정부과제 공고이면서 제조·AI 관련

### T2 — 참고
일반 AI, 로봇, 제조 뉴스.

**판정 조건**:
- `technology` 키워드 포함하지만 T0/T1 미충족
- 일반 산업 뉴스

**technology 키워드 예시**: AI, 딥러닝, LLM, 강화학습, 컴퓨터비전, 센서, IoT, 5G, 클라우드

### T3 — 무관
필터링 대상. UI에 표시하지 않는다.

**판정 조건**:
- 위 어떤 키워드도 매칭되지 않음
- 명시적 제외 키워드 포함 (연예, 스포츠, 부동산 등)

## P(중요도) 결정 규칙 (PRD S2.2)

### P0 — 긴급 (규칙 기반 only, LLM 개입 금지)
다음 조건 중 하나라도 충족하면 P0이다:

1. **정부과제 공고**: 소스가 NTIS, IRIS, 중기부 등 정부과제 플랫폼
2. **마감 임박**: 공고 마감일이 7일 이내
3. **핵심 키워드 밀집**: T0 분류이면서 core 키워드 3개 이상

P0 판정은 반드시 규칙 기반으로만 한다. LLM 판단을 사용하지 않는다.

### P1 — 중요
- T0 또는 T1 분류이면서 published_at이 24시간 이내
- LLM이 "업계 영향도 높음"으로 판단한 경우 (T0/T1 항목에 한해)

### P2 — 일반
- P0, P1 조건에 해당하지 않는 모든 항목

## 스코어링 가중치 (PRD S7)

```
score = w_topic    * topic_score
      + w_priority * priority_score
      + w_recency  * recency_score
      + w_source   * source_trust_score
      + w_keyword  * keyword_match_score
```

### 기본 가중치
| 가중치 | 값 | 설명 |
|--------|-----|------|
| w_topic | 0.30 | 주제 적합도 |
| w_priority | 0.25 | 중요도 등급 |
| w_recency | 0.20 | 최신성 |
| w_source | 0.15 | 출처 신뢰도 |
| w_keyword | 0.10 | 키워드 매칭 밀도 |

### 개별 점수 계산

**topic_score**:
- T0: 1.0, T1: 0.7, T2: 0.3, T3: 0.0

**priority_score**:
- P0: 1.0, P1: 0.6, P2: 0.2

**recency_score**:
- 24시간 이내: 1.0
- 3일 이내: 0.7
- 7일 이내: 0.4
- 그 이상: 0.1

**source_trust_score**:
- 정부 공식(NTIS, IRIS 등): 1.0
- 학술(IEEE, Springer 등): 0.9
- 업계 전문 매체: 0.7
- 일반 뉴스: 0.5
- 블로그/커뮤니티: 0.3

**keyword_match_score**:
- 매칭된 키워드 수 / 전체 키워드 수 (0.0 ~ 1.0)
- core 키워드는 가중치 2배

### 화장품 제조 맥락 보너스
- "화장품", "코스맥스", "OEM", "ODM", "뷰티테크" 키워드 포함 시: topic_score에 +0.2 (최대 1.0)
- 정부과제 출처: source_trust_score를 1.0으로 고정

## 중복 제거 로직 (PRD S6)

### 1단계: 제목 정규화
```
원본: "[긴급] 코스맥스, AI 로봇 도입 — 생산성 30% ↑"
정규화: "코스맥스ai로봇도입생산성30"
```
- 공백, 특수문자, 조사, 기호 제거
- lowercase 변환
- 숫자는 유지

### 2단계: 유사도 계산
- 정규화된 제목 간 코사인 유사도를 계산한다.
- 임계값: >= 0.85 → 중복 후보

### 3단계: 병합 규칙
- **같은 소스 내 중복**: 최신 항목만 유지, 이전 항목 삭제
- **다른 소스 간 중복**:
  - canonical = 먼저 크롤링된 항목 (부모)
  - discovery = 나중 크롤링된 항목 (자식)
  - 자식의 고유 정보(body, tags)를 부모에 병합
  - 자식 ID를 부모의 `merged_from[]`에 추가
  - UI에는 canonical만 표시

### 4단계: 검증
- 병합 후 항목 수가 원본의 50% 이하로 줄어들면 경고 로그 출력
- 병합된 항목의 score는 부모·자식 중 높은 값을 채택

## 키워드 관리

키워드 사전: `config/keywords.yaml`

```yaml
keywords:
  core:
    - 로봇
    - 자동화
    - 피지컬AI
    - physical AI
    - 휴머노이드
    - 협동로봇
    - 디지털트윈
    - 스마트팩토리
  industry:
    - 화장품
    - 코스맥스
    - OEM
    - ODM
    - 뷰티테크
  technology:
    - AI
    - 딥러닝
    - LLM
    - 컴퓨터비전
  government:
    - 정부과제
    - NTIS
    - IRIS
    - 국가연구개발
```

키워드 추가·삭제 시 반드시 기존 items에 대한 재분류 테스트를 실행하여 영향을 확인한다.

## 실행 명령

```bash
npm run curate                  # 전체 큐레이션 (fast phase 결과 대상)
npm run curate:final            # 최종 큐레이션 (slow phase 병합 후)
npm run curate:dry-run          # 결과 미저장, 콘솔 출력만
npm run curate:stats            # 분류 통계 출력
```

## 출력

최종 결과는 `public/data/items.json`에 기록한다.

```json
{
  "meta": {
    "phase": "complete",
    "crawled_at": "2026-04-13T00:00:00Z",
    "total": 142,
    "by_topic": { "T0": 12, "T1": 38, "T2": 89, "T3": 3 },
    "by_priority": { "P0": 5, "P1": 24, "P2": 113 },
    "duplicates_merged": 17
  },
  "items": [...]
}
```

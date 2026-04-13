---
name: crawl-sources
description: "소스 사이트에서 정부과제·뉴스를 크롤링하는 스킬. 어댑터 추가, 소스 레지스트리 수정, 크롤링 실행, fixture 테스트 관련 작업에 이 스킬 사용. '크롤링', '어댑터', '소스 추가', '수집', 'crawl', '스크래핑', '파싱', '피드', 'RSS', 'Playwright', '소스 등록', '소스 삭제', '크롤러', 'fixture', '회귀 테스트' 키워드 시 트리거."
---

# Crawl Sources

29개 소스 사이트에서 정부과제 공고·뉴스·논문을 수집하는 크롤링 스킬.

## 에이전트

이 스킬은 `crawler-architect` 에이전트가 수행한다. 에이전트 정의: `.claude/agents/crawler-architect.md`

## 소스 레지스트리

모든 소스는 `config/sources.yaml`에 등록한다. 이 파일이 크롤링의 단일 진입점이다.

```yaml
# config/sources.yaml 예시
sources:
  - id: ntis
    name: 국가과학기술지식정보서비스
    url: https://www.ntis.go.kr
    adapter_group: A    # API
    schedule: daily
    enabled: true
    timeout_ms: 30000
    delay_ms: 1000
```

## 5개 어댑터 그룹

### 그룹 A: API 어댑터
- REST/GraphQL API를 직접 호출하여 JSON 응답을 파싱한다.
- 인증 토큰이 필요한 경우 `config/secrets.yaml` (gitignore 대상)에서 로드한다.
- 파일: `src/crawlers/adapters/api-adapter.ts`

### 그룹 B: RSS 어댑터
- RSS/Atom 피드를 파싱한다.
- feedparser 라이브러리 사용.
- 파일: `src/crawlers/adapters/rss-adapter.ts`

### 그룹 C: NamuCMS 어댑터
- 나무엔미디어 CMS 기반 정부 사이트 6개를 1개 어댑터로 커버한다.
- CMS 공통 HTML 구조를 활용하여 목록·상세 페이지를 파싱한다.
- 파일: `src/crawlers/adapters/namu-cms-adapter.ts`
- 대상 사이트: sources.yaml에서 `adapter_group: C`인 항목 참조

### 그룹 D: HTML 어댑터
- 정적 HTML을 cheerio로 파싱한다.
- 사이트별 selector 설정을 sources.yaml의 `selectors` 필드에서 읽는다.
- 파일: `src/crawlers/adapters/html-adapter.ts`

### 그룹 E: Playwright 어댑터
- JavaScript 렌더링이 필요한 사이트를 headless Chromium으로 크롤링한다.
- 느리므로 slow phase에서만 실행한다.
- 파일: `src/crawlers/adapters/playwright-adapter.ts`
- 타임아웃: 60초 (기본 30초보다 길다)

## 새 소스 추가 절차

1. **레지스트리 등록**: `config/sources.yaml`에 소스 추가
   ```yaml
   - id: new-source
     name: 새 소스 이름
     url: https://example.com
     adapter_group: D
     schedule: daily
     enabled: true
     selectors:
       list: ".board-list tbody tr"
       title: ".subject a"
       date: ".date"
       link: ".subject a@href"
   ```

2. **어댑터 작성**: 해당 그룹 어댑터에 파싱 로직 추가 (또는 기존 어댑터 재사용)

3. **fixture 생성**: 소스의 샘플 응답을 저장
   ```bash
   npm run create-fixture -- new-source
   ```
   결과: `tests/fixtures/new-source.json`

4. **테스트 실행**:
   ```bash
   npm test -- --grep new-source
   ```

5. **통합 테스트**:
   ```bash
   npm run crawl:dry-run -- --source new-source
   ```

## Progressive Crawling 전략

### Fast Phase (A~D 그룹)
```bash
npm run crawl:fast
```
- API, RSS, CMS, HTML 어댑터를 병렬 실행한다.
- 수 초 내 완료된다.
- 완료 즉시 `public/data/items.json`에 중간 결과를 기록한다.
- `meta.phase: "fast"` 플래그를 설정한다.

### Slow Phase (E 그룹)
```bash
npm run crawl:slow
```
- Playwright 어댑터를 순차 실행한다.
- 수십 초~수 분 소요된다.
- fast phase 결과에 slow phase 결과를 병합한다.
- `meta.phase: "complete"` 플래그로 갱신한다.

### 전체 실행
```bash
npm run crawl        # fast → slow 순차 실행
npm run crawl:dry-run  # 실제 요청 없이 fixture로 테스트
```

## fixture 테스트

### 목적
네트워크 호출 없이 어댑터의 파싱 로직만 검증한다.

### fixture 파일 구조
```
tests/fixtures/
  ├── ntis.json           # 그룹 A 소스
  ├── springer-rss.json   # 그룹 B 소스
  ├── iris.json           # 그룹 C 소스
  ├── mfds.json           # 그룹 D 소스
  └── naver-news.json     # 그룹 E 소스
```

### fixture 갱신
```bash
npm run update-fixtures              # 전체 갱신
npm run update-fixtures -- ntis      # 특정 소스만
```

### 테스트 실행
```bash
npm test                             # 전체 테스트
npm test -- --grep "adapter"         # 어댑터 테스트만
npm test -- --grep "ntis"            # 특정 소스 테스트
```

## 에러 격리 원칙

- 한 소스의 크롤링 실패가 다른 소스에 영향을 주지 않는다.
- 실패한 소스는 결과에 에러 상태로 기록한다.
- 3회 연속 실패 시 해당 소스를 자동으로 비활성화한다.
- 모든 어댑터는 try-catch로 감싸고, 에러를 상위로 전파하지 않는다.

## 출력 형식

크롤링 결과는 `RawItem[]` 배열로 content-curator에게 전달된다.

```typescript
interface RawItem {
  source_id: string;
  title: string;
  url: string;
  published_at: string;
  body_text?: string;
  body_html?: string;
  tags?: string[];
  crawled_at: string;
}
```

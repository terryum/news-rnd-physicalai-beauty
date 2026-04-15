---
name: send-digest
description: "일일 이메일 다이제스트를 생성·발송하는 스킬. 크롤링된 사업공고·뉴스를 필터링하여 한국어 뉴스 클리핑 이메일로 발송한다. '이메일', '다이제스트', '뉴스레터', '메일 보내', 'email', 'digest', 'newsletter', '메일링', '클리핑', '일일 메일', '데일리 메일', '메일 발송', '이메일 테스트', '프리뷰' 키워드 시 트리거. 이메일 관련 작업이면 반드시 이 스킬을 사용할 것."
---

# Send Digest

크롤링된 `public/data/items.json` 데이터를 기반으로 일일 이메일 다이제스트를 생성·발송하는 스킬.

## 실행 모드: 서브 에이전트

## 에이전트 구성

| 에이전트 | 정의 파일 | 역할 | 출력 |
|---------|----------|------|------|
| email-engineer | `.claude/agents/email-engineer.md` | 필터링·렌더링·전송 코드 개발 | `worker/digest/*` |
| notify-ops | `.claude/agents/notify-ops.md` | GitHub Actions 워크플로우·시크릿 관리 | `.github/workflows/digest.yml` |

## 다이제스트 3개 섹션

| 섹션 | 필터 기준 | 정렬 |
|------|----------|------|
| 새로 올라온 주요 사업공고 | gov, P0/P1, publishedAt > now-30h | 최신순 |
| 마감 임박 코스맥스 관련 사업공고 | gov, open, deadlineAt 7일 이내, 코스맥스 관련 | 마감일순 |
| 오늘의 주요 뉴스 | news, P0, publishedAt > now-30h | 점수순 |

## 실행 명령

```bash
npm run digest           # 실제 발송
npm run digest:preview   # HTML 파일만 생성 (발송 안 함)
npm run digest:dry-run   # 필터 결과를 콘솔에 출력
```

## 데이터 흐름

```
public/data/items.json
    ↓
worker/digest/filter.ts  (3개 섹션 필터링)
    ↓
worker/digest/render.ts  (HTML 이메일 렌더링)
    ↓
worker/digest/transport.ts (Gmail SMTP 발송)
```

## 워크플로우

### Phase 1: 필터링 + 렌더링 개발
1. email-engineer가 `worker/digest/` 모듈 개발
2. 테스트 픽스처로 필터 로직 검증
3. `npm run digest:preview`로 HTML 시각적 확인

### Phase 2: 전송 + CI/CD
1. email-engineer가 `scripts/send-digest.ts` 진입점 개발
2. notify-ops가 `.github/workflows/digest.yml` 워크플로우 작성
3. GitHub Actions 시크릿 설정 (사용자 수동)

### Phase 3: 검증
1. `npm run digest:dry-run`으로 필터 결과 확인
2. `--to terry.t.um@gmail.com`으로 개인 메일 테스트 발송
3. 프로덕션 수신자로 전환

## 환경변수

| 변수 | 용도 | 기본값 |
|------|------|--------|
| `GMAIL_USER` | 발신 Gmail 주소 | (필수) |
| `GMAIL_APP_PASSWORD` | Gmail App Password | (필수) |
| `DIGEST_RECIPIENT` | 수신자 이메일 | (필수) |

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| items.json 없음 | 에러 로그 + exit 1 |
| 3개 섹션 모두 빔 | 발송 스킵, 로그 출력 |
| SMTP 연결 실패 | 에러 메시지 + exit 1 |
| 일부 섹션 필터 에러 | 해당 섹션 스킵, 나머지 발송 |

## 테스트 시나리오

### 정상 흐름
1. `public/data/items.json`에 P0 gov + P0 news 아이템 존재
2. 필터링 → 3개 섹션에 아이템 배분
3. HTML 렌더링 → 인라인 CSS 테이블 레이아웃
4. Gmail SMTP로 발송
5. 예상 결과: 수신자에게 한국어 뉴스 클리핑 이메일 도착

### 에러 흐름
1. items.json이 비어있거나 모든 아이템이 P2
2. 3개 섹션 모두 빔
3. 발송 스킵, "No items to send" 로그 출력
4. exit code 0 (에러 아님, 정상 스킵)

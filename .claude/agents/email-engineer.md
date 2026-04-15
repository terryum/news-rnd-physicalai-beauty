# Email Engineer Agent

## 핵심 역할
이메일 다이제스트 파이프라인 코드를 개발하고 유지보수한다. 아이템 필터링, HTML 이메일 렌더링, nodemailer SMTP 전송을 담당한다.

## 작업 원칙

### 이메일 렌더링 컨텍스트
1. 이메일 HTML은 웹 UI와 완전히 다른 렌더링 환경이다. 외부 CSS/JS 불가, 인라인 스타일만 사용한다.
2. 테이블 기반 레이아웃을 사용한다 (Gmail, Outlook 호환).
3. 시스템 폰트 스택: `-apple-system, 'Malgun Gothic', sans-serif`
4. 이미지는 가능한 사용하지 않는다. 텍스트 기반으로 깔끔하게 구성한다.

### 다이제스트 3개 섹션
| 섹션 | 필터 기준 | 정렬 |
|------|----------|------|
| 새로 올라온 주요 사업공고 | gov, P0/P1, 최근 30시간 | publishedAt 내림차순 |
| 마감 임박 코스맥스 관련 | gov, open, deadlineAt 7일 이내, 코스맥스 관련 키워드 | deadlineAt 오름차순 |
| 오늘의 주요 뉴스 | news, P0, 최근 30시간 | score 내림차순 |

### 코드 구조
```
worker/digest/
├── filter.ts      # 섹션별 필터링 함수
├── render.ts      # HTML 이메일 렌더링
├── transport.ts   # nodemailer SMTP 설정
└── types.ts       # DigestSection, DigestData 타입
```

## 입력/출력 프로토콜
- **입력**: `public/data/items.json` (Item[])
- **출력**: HTML 이메일 문자열, 발송 결과

## 에러 핸들링
- items.json 로드 실패: 에러 로그 후 종료 (빈 이메일 발송하지 않음)
- 모든 섹션 비어있음: 발송 스킵, 로그만 출력
- SMTP 연결 실패: 에러 메시지 출력, 프로세스 exit code 1
- HTML 렌더링 에러: 해당 섹션 스킵, 나머지 섹션만 발송

## 협업
- `public/data/items.json`을 읽어 다이제스트를 생성한다 (content-curator가 생성한 데이터).
- notify-ops가 GitHub Actions에서 이 코드를 실행한다.

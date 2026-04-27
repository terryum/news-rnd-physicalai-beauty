# Design System

이 사이트의 디자인 시스템은 [terryum.ai](https://www.terryum.ai) 와 동일한 토큰을 공유한다. 두 사이트는 같은 사람의 자산이므로 폰트·색상·인터랙션이 일관되어야 한다. 새 컴포넌트를 추가할 때는 **이 문서의 토큰/패턴 외에 인라인 색상값을 직접 쓰지 말 것** (외부 브랜드 로고 등 예외는 별도 표시).

Single source of truth: `src/app/globals.css` 의 `@theme` 블록.

## 토큰

### 색상 (light / dark)

| 토큰 | Light | Dark | 용도 |
| --- | --- | --- | --- |
| `bg-base` | `#ECF0F2` | `#0B1120` | 페이지 배경 |
| `bg-surface` | `#E3E8EB` | `#1A2332` | 카드/섹션 배경 |
| `text-primary` | `#111827` | `#F9FAFB` | 본문/제목 |
| `text-secondary` | `#374151` | `#D1D5DB` | 보조 본문 |
| `text-muted` | `#6B7280` | `#9CA3AF` | 메타데이터/캡션 |
| `line-default` | `#E5E7EB` | `#1F2937` | 기본 보더 |
| `line-strong` | `#D1D5DB` | `#374151` | 강조 보더 (구분선) |
| `line-dark` | `#9CA3AF` | `#4B5563` | 더 강한 보더 |
| `accent` | `#0D9488` | `#14B8A6` | 링크, CTA, 강조 (teal) |
| `accent-hover` | `#0F766E` | `#2DD4BF` | accent hover 상태 |

Tailwind 클래스: `bg-bg-base`, `text-text-primary`, `border-line-default`, `text-accent`, `bg-accent`, `bg-accent-hover` 등.

### 타이포그래피

폰트: 영문 Inter (`next/font/google`) → 한글은 시스템 폰트 폴백 (Apple SD Gothic Neo / Malgun Gothic / Noto Sans KR).

| 위계 | 클래스 | 용도 |
| --- | --- | --- |
| Page title | `text-2xl font-bold tracking-tight text-text-primary` | 페이지 H1 |
| Section title | `text-sm font-semibold text-text-primary` | 섹션 카드 헤더 |
| Card title | `text-sm font-medium text-text-primary` | 카드/리스트 항목 제목 |
| Body | `text-sm text-text-secondary` | 본문 |
| Meta | `text-xs text-text-muted` | 출처/날짜/캡션 |
| Micro | `text-[10px] text-text-muted` | 라벨/배지 |

### 라운드/스페이싱

| 용도 | 값 |
| --- | --- |
| 입력/버튼 (primary CTA, chip) | `rounded-full` |
| 리스트 항목 | `rounded-lg` (8px) |
| 섹션 카드 | `rounded-xl` (12px) |
| 컨테이너 | `max-w-4xl px-4 md:px-6 lg:px-8` |
| 섹션 간격 | `space-y-6` |

### 트랜지션/애니메이션

- 기본 hover: `transition-colors` (150ms 기본)
- focus ring: `focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent`
- 등장: `animate-fade-in` (`fade-in` keyframe, 0.15s ease-out)

## 공통 className 패턴

| 용도 | className |
| --- | --- |
| Primary CTA (구독, 액션) | `inline-flex items-center justify-center rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors` |
| Secondary 버튼 | `inline-flex items-center justify-center rounded-full border border-line-default bg-bg-surface px-3 py-1.5 text-sm text-text-secondary hover:text-accent hover:border-accent/40 transition-colors` |
| Icon 버튼 | `w-8 h-8 rounded-full border border-line-default flex items-center justify-center text-text-muted hover:text-accent transition-colors` |
| Filter chip (선택) | `bg-accent/10 text-accent border border-accent rounded-full px-3 py-1 text-xs font-medium transition-colors` |
| Filter chip (비선택) | `bg-bg-surface text-text-secondary border border-line-default hover:text-accent hover:border-accent/40 rounded-full px-3 py-1 text-xs font-medium transition-colors` |
| Input | `rounded-full border border-line-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors` |
| 리스트 카드 행 | `group rounded-lg border border-line-default p-3 hover:border-accent/40 transition-colors` |
| 섹션 카드 | `rounded-xl border border-line-default bg-bg-surface overflow-hidden` |
| 구분선 | `border-t border-line-default` 또는 `h-px bg-line-default` |
| 텍스트 링크 | `text-text-secondary hover:text-accent transition-colors` |

## 시맨틱 컬러 정책

UI 의 모든 강조는 **단일 accent (teal)** 로 통일한다. 우선순위/카테고리/긴급도 등 위계는 텍스트(굵기·약어), 위치, 상단 배치로 표현하지 색상으로 표현하지 않는다.

예외:
- 외부 브랜드 로고/네이티브 색상 (예: 깃허브 옥토캣 등)
- 데이터 시각화 (차트) — 별도 팔레트 사용 가능

## 다크 모드

- `<html>` 의 `data-theme` 속성으로 제어 (`light` | `dark`)
- `localStorage.theme` 에 사용자 선택 저장
- 미선택 시 `prefers-color-scheme: dark` 를 폴백으로 사용 (`@media (prefers-color-scheme: dark) html:not([data-theme="light"]) { ... }`)
- `<head>` 의 inline blocking script 가 hydration 전에 `data-theme` 을 박아 flash 방지 (`src/app/layout.tsx`)

토글: `src/components/theme-toggle.tsx` — sun/moon 아이콘 자동 교체는 `globals.css` 의 `.theme-icon-moon` / `.theme-icon-sun` CSS 규칙으로.

## 새 컴포넌트 추가 시 체크리스트

1. 색상은 토큰 클래스만 사용 (`text-accent`, `bg-bg-surface`, `border-line-default`...). hex / rgb / oklch 직접 금지.
2. 폰트는 `font-sans` (기본) — 별도 지정 불필요.
3. 인터랙티브 요소에는 `transition-colors` + focus ring 필수.
4. 다크 모드에서 텍스트/보더가 보이는지 토글로 확인.
5. `max-w-4xl` 컨테이너 기준 — `px-4 md:px-6 lg:px-8` 패딩 일관 사용.

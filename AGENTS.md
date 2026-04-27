<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system

`docs/design-system.md` 가 single source of truth. terryum-ai 와 동일한 `@theme` 토큰을 `src/app/globals.css` 에서 정의한다. 새 UI 를 추가할 때는 토큰 클래스(`text-accent`, `bg-bg-surface`, `border-line-default`, `text-text-primary` 등)만 사용하고, hex/rgb/oklch 색상값을 인라인으로 쓰지 말 것. 우선순위/카테고리 위계는 색상이 아닌 텍스트·위치로 표현한다 (단일 teal accent 정책).

UI 컴포넌트 라이브러리 없음 — Base UI, shadcn, CVA, clsx, tailwind-merge 모두 제거됨. 순수 Tailwind 클래스만 사용한다.

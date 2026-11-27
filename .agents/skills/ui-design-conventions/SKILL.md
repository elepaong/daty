---
name: ui-design-conventions
description: daty 프론트엔드 화면·컴포넌트를 만들거나 고칠 때 쓴다. 디자인 토큰, 세 디자인(classic/retro/scrap)과 밝기 모드, 반응형 기준, 접근성(44px, 모달 포커스, 확인창) 규칙.
---

# 화면 작업 규칙

## 색·글꼴
- `frontend/src/index.css`의 `@theme` 토큰만 쓴다. 16진수 색 금지
- `brand`(#00A896)는 장식(점·막대·테두리)만. 글자·글자가 올라가는 배경은 `brand-strong`, hover `brand-deep`
- 어두운 모드: 카드·시트·입력창은 `bg-surface`(not `bg-white`), 청록 글자 `text-brand-text`, 늘 어두운 곳 `bg-night`. 색 채움 위 `text-white`, 사진 위 `bg-white/15`는 그대로

## 세 디자인 (`<html data-theme="classic|retro|scrap">`)
- 공용 모양은 `ui-*` 클래스(`ui-card`, `ui-chip`, `ui-title` 등, `index.css` 아래쪽)
- 한 곳만 다르면 `retro:` / `scrap:` 변형 클래스
- 코드 분기(`useIsRetro`, `PixelSprite`)는 아이콘·핀·마스코트처럼 그림이 다를 때만
- 도트: 긴 글에 `ui-prose`, 픽셀 테두리 `ui-box`/`ui-btn`/`ui-outline`
- 스크랩북은 토큰 교체가 중심 → 토큰을 쓰면 자동으로 맞는다. `tape-*` 색은 모드 무관
- 애니메이션: `useMotionPreset()`, `RISE_IN`

## 반응형
- `< md`(736px, 46rem): 폰 한 열 + 하단 탭 / `md`~`lg`: 아이콘 레일 사이드바 / `lg`(1024px)~: 넓은 사이드바
- JS 분기는 `useIsDesktop`, 나머지는 `md:` 클래스. `lg:`는 1024px부터만 맞는 것
- 데스크톱에서 바텀시트는 가운데 모달, `/places/:id`는 지도 왼쪽 열

## 접근성
- 44px보다 작은 버튼: `ui-hit`(혼자) / `ui-hit-y`(나란히, 높이만). `absolute` 요소에는 쓰지 않음
- 모달: `useDialogFocus`. 확인: `useConfirm()` (`danger`는 삭제). `window.confirm` 금지
- 포커스 테두리는 전역 `:focus-visible`

## 확인
- 세 디자인 × 밝게/어둡게, 375px·768px·1280px 폭, ko/ja 둘 다에서 화면을 본다(가능하면 Playwright 스크린샷)
- 디자인 원본: Figma `7Qc5QDKQEeFWbnAeSbhEA7` (노드 id는 `PROJECT_CONTEXT.md` 7절)

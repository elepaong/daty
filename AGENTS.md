# AGENTS.md — daty

커플이 함께 쓰는 데이트 기록 웹앱(지도/저널, 캘린더, 앨범). 실제로 배포해서 운영 중이다.
이 파일은 Codex 같은 AI 에이전트가 **작업 전에 반드시 지킬 규칙**만 모은 것이다.

- 설계 배경·기능·아키텍처: `PROJECT_CONTEXT.md`
- **상세 레퍼런스: `CLAUDE.md`** — API 엔드포인트별 동작, 데이터 모델, 업로드 패턴, 인프라, 프론트 세부 동작. 이 파일(`AGENTS.md`)을 `@AGENTS.md`로 가져오고 그 아래에 상세만 둔다. 이름은 Claude Code용이지만 **Codex도 API·스키마·업로드·인프라를 건드리기 전에 읽는다**
- 지난 구현 이력과 시행착오: `DEVELOPMENT_HISTORY.md`
- 남은 일: `ROADMAP.md`
- 운영(백업·배포·서버 이전): `docs/operations.md`, 비밀번호 재설정 설계: `docs/password-reset.md`

> 이 파일은 32KiB(Codex `project_doc_max_bytes` 기본값) 안에 들어가야 한다. 한글은 한 글자가 3바이트다. 늘릴 때는 `wc -c AGENTS.md`로 확인하고, 길어지면 세부 내용을 `PROJECT_CONTEXT.md`로 옮긴다.

---

## 1. 저장소 구조 (모노레포, 루트에 package.json 없음)

| 경로 | 내용 |
|---|---|
| `frontend/` | React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4(`@tailwindcss/vite`, PostCSS 설정 없음) + TanStack Query 5 + React Router 8 + `@vis.gl/react-google-maps` + Motion |
| `backend/` | Node 22 + Express 5 + Prisma 7(PostgreSQL 15, `@prisma/adapter-pg`) + Zod 4 + TypeScript 7 (ESM, `NodeNext`) |
| `docs/` | 운영 문서 |
| `.github/workflows/` | `ci.yml`(PR·main), `deploy-backend.yml`(main의 backend 변경 시, 저장소 변수 `DEPLOY_HOST`가 있어야 켜짐) |
| `.agents/skills/` | Codex·Claude 공용 작업 절차(Skills). `MIGRATION.md` 참고 |
| `.codex/` | Codex 설정 예시(`*.example.*`). 그대로는 적용되지 않는다 |

각 패키지는 **자기 디렉터리에서** `npm install` / `npm run ...` 한다.

### frontend/src
- `features/<화면>/` 화면 (`map`, `calendar`, `albums`, `places`, `records`, `auth`, `recap`, `memories`)
- `components/` 공용 UI, `lib/` API 클라이언트·쿼리·타입·순수 유틸(테스트 대상)
- 라우트: 탭 `/`, `/calendar`, `/albums` + 하위 `/places/:id`, `/places/:id/edit`, `/albums/:id`, `/recap`. 로그인 없이 열리는 `/reset-password?token=`은 로그인 게이트보다 앞에 있다
- `public/sw.js`: 서비스 워커(빌드 도구 없이 손으로 쓴 파일)

### backend/src
- `server.ts` 진입점, `app.ts` 앱 구성, `modules/*.routes.ts` 라우터, `lib/` 공용 로직, `middlewares/` (`auth.ts`, `error-handler.ts`), `config/env.ts`(zod로 환경 변수 검증)
- `generated/prisma/` — Prisma Client 생성물. **커밋하지 않는다**(`npm install`의 postinstall이 생성)
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `scripts/backup.mjs`(매일 DB 덤프 → R2), `scripts/server-setup.sh`(일회성 서버 설정)
- `test/` — Node 내장 테스트 러너 + tsx, 실제 PostgreSQL 사용

---

## 2. 빌드·테스트·실행

필요한 것: Node.js 22, Docker(로컬 DB). 로컬 개발 DB는 `backend/compose.yaml`(postgres:15-alpine, `127.0.0.1:5433`, 계정·DB는 compose 파일 참고, DB 이름 `daty_dev`).

```bash
# backend (http://127.0.0.1:4000)
cd backend
npm install
cp .env.example .env          # 로컬 기본값. SESSION_SECRET은 새로 만든다(openssl rand -base64 48)
npm run db:up                 # 개발 DB 컨테이너
npm run db:migrate:deploy     # 마이그레이션 적용
npx prisma db seed            # 샘플 데이터 + 개발 계정 2개 (계정 정보는 prisma/seed.ts)
npm run dev
```

```bash
# frontend (http://localhost:5173, /api는 127.0.0.1:4000으로 프록시)
cd frontend
npm install
cp .env.example .env.local    # Google Maps 키·지도 ID (값은 사용자에게 받는다)
npm run dev
```

R2·메일(Resend)·웹 푸시 환경 변수를 비우면 그 기능만 꺼진 채(503 `STORAGE_DISABLED` / `MAIL_DISABLED` / `PUSH_DISABLED`) 실행된다.

### 커밋 전에 반드시 통과 (CI와 같은 순서)

| 패키지 | 명령 |
|---|---|
| `frontend/` | `npm run lint` → `npm test`(Vitest, `src/**/*.test.ts`, 화면 없는 `src/lib` 로직) → `npm run build`(`tsc -b && vite build`) |
| `backend/` | `npm run build`(`tsc`) → `npm test` |

- 백엔드 테스트는 개발 DB 컨테이너 안의 **별도 DB `daty_test`**를 만들고 마이그레이션한 뒤 매번 비운다. `test/env.ts`가 `.env`를 읽지 않고 테스트용 값을 넣으며, DB 이름이 `_test`로 끝나지 않으면 거부한다. 다른 주소는 `TEST_DATABASE_URL`로 지정한다. `npm run db:up`이 먼저 돼 있어야 한다
- 테스트는 `--test-concurrency=1`로 파일 하나씩 돈다. 메일은 `outbox`, 푸시는 `pushOutbox`(메모리)에 쌓인다
- Docker가 없는 환경(일부 클라우드 샌드박스)에서는 백엔드 테스트를 못 돌릴 수 있다. 그때는 `npm run build`까지 확인하고 **테스트를 못 돌렸다고 분명히 보고**한다. 테스트를 건너뛰거나 지워서 통과시키지 않는다
- 의존성을 추가·변경하지 않았다면 `package-lock.json`을 커밋하지 않는다(로컬 `npm install`이 바꾼 lock을 되돌린 커밋이 있다)

---

## 3. 작업 규칙 (Git·PR)

- `main`에 직접 커밋하지 않는다. 브랜치를 만들어 작업하고 PR로 병합한다
- 커밋 메시지: 영어, Conventional Commits 형식을 주로 쓴다(`feat:`, `fix(frontend):`, `perf(backend):`, `docs:`, `chore:`, `test:`). 제목은 사용자 입장에서 무엇이 바뀌었는지 쓰고("show every error in the user's language"), 본문에 왜·어떻게를 적는다
- 비밀 값(R2 키, DB URL, `SESSION_SECRET`, API 키, VAPID 키, 배포 SSH 키 등)은 `.env`에만 두고 **절대 커밋하거나 문서·로그·커밋 메시지에 쓰지 않는다**. 새 환경 변수는 이름과 설명만 `.env.example`에 추가하고 `src/config/env.ts`에서 검증한다
- 공개 저장소다. 실제 사용자 데이터·도메인 외 개인정보를 넣지 않는다
- 문서 역할을 나눈다: **규칙**(컨벤션·금지·빌드와 테스트)은 `AGENTS.md`만, **동작·API 상세**는 `CLAUDE.md`, 설계 배경은 `PROJECT_CONTEXT.md`. `CLAUDE.md`에 규칙을 다시 쓰지 않는다(중복은 어긋난다). 동작이 바뀌면 `CLAUDE.md`와 `PROJECT_CONTEXT.md`의 해당 부분을 함께 고친다. 문서와 코드가 어긋나면 코드가 기준이다

---

## 4. 백엔드 규칙

- **ESM**: 상대 경로 import에 `.js` 확장자를 붙인다(`import { prisma } from "../lib/prisma.js"`). 타입만 가져올 때는 `import type`(`verbatimModuleSyntax`)
- 스타일: 큰따옴표, 세미콜론, 2칸 들여쓰기, `strict` + `noUncheckedIndexedAccess`
- 요청 검증은 라우터 파일 안의 zod 스키마로 한다(`z.object(...).parse(req.body)`). id 파라미터는 `lib/http.ts`의 `idParam.parse(req.params)`, 사용자 링크는 `webUrl()`(http/https만)
- 에러는 `throw new HttpError(status, "English message", "CODE")`. 응답은 항상 `{ error, code }`. ZodError·깨진 JSON → 400 `INVALID_REQUEST`, Prisma P2025 → 404 `NOT_FOUND`, P2034 → 409 `CONFLICT`, 나머지 → 500 `INTERNAL` + 관리자 메일(`reportError`). **새 에러 코드를 만들면 프론트 `messages.ts`의 `errors`(ko·ja)에 문구를 추가**한다
- 라우터 연결은 `app.ts`. 커플 데이터 라우터는 `requireAuth, requireCouple`을 둘 다 거친다
- **커플 데이터 쿼리는 반드시 `req.coupleId`로 범위를 제한**한다: `where: { id, coupleId: req.coupleId }`. 다른 커플의 id로 접근하면 404가 나와야 한다. 커플 데이터 라우트를 새로 만들면 `test/couple-scope.test.ts`에 다른 커플 id로 접근하는 경우를 추가한다
- 메모리 1GB 서버(Node·PostgreSQL·Nginx 한 대): 무거운 의존성(AWS SDK 등)을 넣지 않는다. R2 서명은 `aws4fetch`, 메일은 `fetch`로 Resend HTTP API. 주기 작업은 별도 프로세스·워커 없이 API 프로세스 안의 타이머(`notifier.ts`, `orphans.ts`, `.unref()`)로 한다. 서버에서 TypeScript를 빌드하지 않는다(Actions가 `dist/`를 보낸다)
- **파일 업로드는 백엔드를 거치지 않는다.** multipart 엔드포인트를 만들지 않는다. 패턴: ① 클라이언트가 presigned PUT URL 요청 → ② R2에 직접 PUT → ③ 객체 키를 백엔드에 보내면 백엔드가 R2 HEAD로 크기·형식을 확인하고 DB에 기록. 키 형식(`couples/{coupleId}/albums/{albumId}/{uuid}.{ext}`, `avatars/{userId}/{uuid}.jpg`)을 서버에서 검사한다
- R2 버킷은 비공개. 응답의 이미지 URL은 `lib/storage.ts`가 매번 만드는 서명 GET URL이다(서명 시각을 6일 구간에 고정해 브라우저 캐시가 유지되게 함 — 이 동작을 깨지 않는다)
- 비밀번호 해시는 `lib/password.ts`(scrypt, 동시에 2개까지만). 로그인류 실패 제한은 `lib/limits.ts`(IP별 + 계정별, 15분 10회)
- 짝꿍 알림은 `lib/push.ts`의 `notifyPartner`

### DB 스키마 변경
1. `prisma/schema.prisma` 수정 (컬럼은 snake_case `@map`, 모델은 PascalCase, 테이블은 `@@map`으로 복수 snake_case)
2. **로컬 개발 DB에서** `npm run db:migrate -- --name <설명>`(`prisma migrate dev`)로 마이그레이션 파일 생성 → 커밋. CHECK 제약 등은 생성된 SQL에 손으로 추가한다
3. 운영 DB에는 `npx prisma migrate deploy`만 쓴다(배포 워크플로가 실행). **운영 DB에 `migrate dev`, `db push`, `migrate reset`을 절대 실행하지 않는다.** 운영 DB에는 에이전트가 직접 붙지 않는다
4. `npm run build`, `npm test`

시드: `npx prisma db seed`(DB 이름이 `_dev`로 끝나야 실행, 이미 시드됐으면 건너뜀). 다시 만들려면 `npx prisma db seed -- --reset`.

---

## 5. 프론트엔드 규칙

- 스타일: 작은따옴표, 세미콜론 없음, 2칸 들여쓰기, 함수 컴포넌트 + 훅. ESLint(`typescript-eslint`, `react-hooks`, `react-refresh`) 경고 없이
- 서버 상태는 TanStack Query(`src/lib/queries.ts`의 `keys`와 훅). API 호출은 `src/lib/api.ts`의 `api`. 업로드 재시도는 `withRetry`. 타입은 `src/lib/types.ts`(API 응답과 맞춘다)
- **문구 하드코딩 금지.** `src/lib/messages.ts`의 `ko`와 `ja` **양쪽**에 키를 넣고 `useT()`로 쓴다. `ja`는 `Messages` 타입이라 키가 빠지면 빌드가 깨진다. 에러 문구는 `errorMessage`(`api.ts`)가 `errors[code]` → 상태 코드별 `failures` → `failures.network` 순으로 고른다. 영어 원문을 화면에 내보내지 않는다
- **색 하드코딩 금지.** `src/index.css`의 `@theme` 토큰을 쓴다(`bg-brand-strong`, `text-muted`, `font-display` 등)
  - 브랜드색 `brand`(#00A896)는 흰 글자와 대비가 3:1이 안 된다 → 점·막대·테두리 장식에만. 글자와 글자가 올라가는 배경은 `brand-strong`(hover `brand-deep`)
  - 어두운 모드 대응: 카드·시트·입력창 배경은 `bg-white` 대신 `bg-surface`, 청록 글자는 `text-brand-text`, 늘 어두워야 하는 곳(사진 뷰어·사진 위 덧칠)은 `bg-night`. 색 채움 위 `text-white`와 사진 위 `bg-white/15`는 그대로. Google 지도는 밝은 채로 둔다
- **디자인 세 벌**: 기본(classic), 도트(retro), 스크랩북(scrap). `<html data-theme>`(기기별 localStorage, `src/lib/theme.ts`). 밝기 모드(자동/밝게/어둡게)는 따로 `<html data-mode>`(`src/lib/colorMode.ts`)
  - 여러 곳에 쓰는 모양은 세 디자인을 담은 `ui-*` 클래스(`ui-card`, `ui-chip`, `ui-title`… `index.css` 아래쪽). 한 곳만 다른 건 `retro:` / `scrap:` 변형
  - 스크랩북은 주로 토큰을 바꿔서 그린다(`[data-theme="scrap"]`) → 토큰을 쓰면 자동으로 맞는다. 마스킹 테이프 색 `tape-*`는 모드와 무관
  - 코드에서 디자인을 분기하는 건 아이콘·핀·마스코트처럼 그림이 다른 곳뿐(`useIsRetro`, `PixelSprite`). 도트에서 긴 글(메모·노트)에는 `ui-prose`. 픽셀 테두리만 필요하면 `ui-box`/`ui-btn`/`ui-outline`
  - 애니메이션은 `useMotionPreset()`과 `RISE_IN`
- **반응형**: 736px(`md`, `index.css`에서 46rem으로 낮춤) 미만은 폰 한 열 + 하단 탭, 이상은 `Sidebar` + 넓은 화면(`useIsDesktop`, 나머지는 `md:`). `md`~`lg`(1024px)는 아이콘 레일 사이드바. `lg:`는 1024px부터만 맞는 것에만
- **접근성**
  - 44px보다 작은 버튼은 모양은 두고 `ui-hit`(혼자 있는 버튼) / `ui-hit-y`(나란히 붙은 버튼, 높이만) 클래스로 누르는 영역을 넓힌다(`absolute` 요소에는 쓰지 않는다)
  - 모달(시트·확인창·뷰어)은 `useDialogFocus`(포커스 이동·Tab 가두기·Escape·복귀, 맨 위 모달만 반응)
  - 확인창은 `window.confirm` 금지 → `const confirm = useConfirm(); if (await confirm({ title, message?, confirmLabel, danger? }))`. 삭제는 `danger`
  - 포커스 표시는 전역 `:focus-visible`. 자체 포커스 테두리가 있는 입력창만 `outline-none`
- 사진·메모의 반응·댓글 UI는 `FeedbackPanel`(`useFeedback`) 하나로. 파일 저장은 `useSaveFiles`
- 날짜는 `src/lib/dates.ts`. 기념일 계산은 `src/lib/anniversary.ts`의 `milestonesOn`(백엔드 `src/lib/digest.ts`와 같은 규칙 — 한쪽을 바꾸면 다른 쪽도)
- 메모 태그 토큰 `{{EAT}}` `{{SEE}}` `{{DO}}`는 `src/lib/memo.ts`가 입력창에서 보는 사람 언어로 풀고 저장할 때 다시 토큰으로
- 저장된 링크를 `href`에 넣기 전 `webLink`(`src/lib/links.ts`)로 거른다
- 서비스 워커 캐시 이름(`daty-api-v1`, `daty-thumbs-v1`)이나 캐시 대상을 바꾸면 `src/lib/offline.ts`의 `clearOfflineData`도 맞춘다
- 순수 로직을 `src/lib`에 추가하면 `*.test.ts`를 같이 쓴다

---

## 6. 하지 말 것 (요약)

- `main` 직접 커밋, 강제 푸시
- 비밀 값 커밋·출력, 운영 DB 접속·`db push`·`migrate reset`
- 백엔드에 multipart 업로드, 서버에서 빌드·별도 프로세스 추가, 무거운 SDK 추가
- `coupleId` 없는 커플 데이터 쿼리
- 하드코딩한 색·문구, `ko`만 넣고 `ja` 빠뜨리기, `window.confirm`
- 테스트를 건너뛰거나 지워서 CI 통과시키기
- Figma 원본(`7Qc5QDKQEeFWbnAeSbhEA7`)과 다른 레이아웃을 임의로 만들기(노드 id는 `PROJECT_CONTEXT.md`)

---

## 7. 작업 절차 (Skills)

`.agents/skills/`에 반복 작업 절차가 있다. 해당 작업이면 먼저 읽는다.

| Skill | 언제 |
|---|---|
| `verify-changes` | 커밋 전 검증(빌드·린트·테스트) |
| `db-schema-change` | Prisma 스키마·마이그레이션 변경 |
| `add-ui-text` | 화면 문구·에러 코드 추가(ko/ja) |
| `new-couple-route` | 커플 데이터 API 추가 |
| `ui-design-conventions` | 화면·컴포넌트 작업(토큰·디자인 세 벌·접근성) |

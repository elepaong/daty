# PROJECT_CONTEXT.md — daty 프로젝트 맥락

새 에이전트가 "이 앱이 무엇이고, 왜 이렇게 만들어졌는가"를 이해하기 위한 문서다. 개발 규칙은 `AGENTS.md`, API·화면의 아주 세부적인 명세(엔드포인트별 동작, 필드 이름)는 `CLAUDE.md`가 원본이다(Claude Code용으로 쓴 문서지만 내용은 도구와 무관하게 정확하다).

---

## 1. 목적

- **커플 둘이 함께 쓰는 데이트 기록 웹앱(PWA).** 가고 싶은 곳·다녀온 곳을 지도에 모으고, 일정과 기록을 캘린더에 남기고, 그날의 사진·동영상을 앨범으로 묶는다
- 사용자는 사실상 한 커플(한국어·일본어 사용자, 한국과 일본을 오감)이다. 가입은 기본으로 닫혀 있다(`SIGNUP_ENABLED`). 그래서 "대규모 확장성"보다 **싼 운영비(무료 티어), 낮은 서버 메모리, 휴대폰에서의 사용감, 두 언어**가 우선순위다
- 실제로 운영 중: 프론트 `ourdaty.com`(Vercel), API `api.ourdaty.com`(Google Cloud VM). 공개 저장소(포트폴리오 성격도 있음, `README.md`/`README.ja.md`)

## 2. 핵심 기능

| 영역 | 기능 |
|---|---|
| 지도/저널 (`/`) | Google 장소 검색(Places API New, 자동완성 세션 토큰)으로 장소 저장, 가고 싶은 곳(WISH)/다녀온 곳(VISITED) 핀, 줌에 따라 핀 묶기(supercluster), 지도 위 Google 장소 아이콘을 탭해서 추가, 내 위치 표시, 랜덤 고르기·가까운 순. 장소 상세(`/places/:id`): Google 장소 사진(작성자 표시 필수) → 앨범 표지 → 카테고리 타일 순 히어로, 메모(여러 개, 태그 토큰), 방문 기록별 날짜·평점, 연결된 앨범 |
| 캘린더 (`/calendar`) | 일정(PLAN)/기록(RECORD), 장소 하나와 연결, 끝 시간(`endsAt`)으로 하루의 "데이트 코스", "이어서 다음 장소 추가", 계획을 "데이트 완료"로 기록 전환 후 사진 추가, 기념일(1일째·100일마다·매년) 표시 |
| 앨범 (`/albums`) | 하루·기간(여행)·월별 앨범, 사진·동영상 업로드(R2 직접), 베스트 컷(표지), 설명(캡션), 순서 바꾸기, 다른 앨범으로 옮기기, 모두/사진/동영상 탭, 핀치 줌 뷰어, 한꺼번에 저장, 연도별·검색, "N년 전 오늘" |
| 함께 쓰기 | 사진·장소 메모에 이모지 반응과 댓글, 짝꿍 활동 웹 푸시(새 일정·기록·가고 싶은 곳·사진 업로드), 아침 알림(기념일·오늘/내일 일정·N년 전 오늘) |
| 연말 결산 (`/recap`) | 한 해 간 곳·동네·사진 수, 1080×1350 공유 이미지(canvas) |
| 계정 | 이메일+비밀번호, 커플 초대 코드(6자리), 닉네임·프로필 사진·기념일 수정, 비밀번호 변경, 짝꿍 발급 재설정 코드·이메일 링크 재설정, 커플 나가기·짝꿍 내보내기·계정 삭제, 저장 공간 사용량, 데이터 JSON 내보내기 |
| 표시 | 한국어/일본어, 디자인 세 벌(기본·도트·스크랩북) × 밝기 모드(자동·밝게·어둡게), 폰·태블릿·데스크톱 레이아웃, 오프라인 읽기 |

## 3. 아키텍처

```
[브라우저 / 홈 화면 PWA]
   │  React SPA (Vercel 정적 호스팅)
   │  ├─ /api/*  ──(vercel.json rewrite, 같은 사이트 → SameSite=Lax 쿠키 전송)──►  Nginx ─► Express API(:4000, 127.0.0.1)
   │  │                                                                                     │  Prisma ─► PostgreSQL 15 (Docker, 127.0.0.1:5432)
   │  │                                                                                     │  타이머: 아침 알림(10분마다), R2 고아 파일 정리(하루 1번)
   │  │                                                                                     │  web-push ─► 브라우저 푸시 서비스
   │  │                                                                                     │  Resend HTTP API (메일)
   │  ├─ R2 presigned PUT/GET (사진·동영상·썸네일·프로필 사진을 서버를 거치지 않고 직접)
   │  └─ Google Maps JS + Places API (New)
   └─ Service Worker: 앱 껍데기 캐시, /api GET 네트워크 우선 캐시, 썸네일 캐시, 푸시 표시

[Google Cloud VM, 1GB]  Node + PostgreSQL + Nginx 한 대.  cron: backup.mjs → 백업 전용 R2 버킷
[GitHub Actions]  CI(lint/test/build) + main의 backend 변경 시 빌드한 dist/를 SSH로 배포
```

### 데이터 모델 (`backend/prisma/schema.prisma`)
- **커플 단위**: `Couple`(초대 코드 `coupleCode`, 기념일) ← `User` 최대 2명. 모든 데이터는 `coupleId`로 소유
- `Place`(지도 핀, `googlePlaceId`는 커플 안에서 유일, 좌표가 있어야 핀이 생김, 상태 WISH/VISITED, 카테고리 enum)
- `PlaceNote`(장소 메모 여러 개, 작성자) / `DateRecord`(PLAN/RECORD, 장소·앨범 연결, 평점 1~5, `scheduledAt`, `endsAt`, `memo`)
- `Album`(`albumDate`~`albumEndDate`, 또는 `monthly` + `albumMonth`, `coverPhotoId`) / `Photo`(`storageKey`, `thumbnailKey`, `mediaType` PHOTO/VIDEO, `takenAt`, `durationSec`, `sizeBytes`, `caption`, `fingerprint`, `displayOrder`)
- `Comment` / `Reaction`(사진 또는 메모 중 하나, DB CHECK; 반응은 사람·대상당 하나)
- `PasswordResetCode`(짝꿍 코드와 이메일 링크 토큰, SHA-256만 저장) / `PushSubscription`(언어·시간대 포함)
- 일부 규칙은 Prisma가 아니라 마이그레이션 SQL의 CHECK로 건다(평점 범위, `endsAt > scheduledAt`, 반응·댓글 대상 하나)

### 인증·보안
- 로그인하면 `daty_session` 쿠키(httpOnly, SameSite=Lax, 30일, HS256 JWT via `jose`). 하루 지난 세션은 다음 요청에서 30일로 재발급
- `requireAuth`가 매 요청 사용자를 조회해 `passwordChangedAt`보다 먼저 발급된 세션을 막는다(비밀번호 변경 → 다른 기기 로그아웃)
- scrypt 해시(해시 하나 32MB → 동시 2개 제한), 로그인·재설정·초대 코드 등 실패 제한(IP별 + 계정별 15분 10회), `TRUST_PROXY`(Vercel 경유 2, Nginx 직접 1)
- 비밀번호 찾기는 이메일을 조회하기 전에 204로 답해서 응답 시간으로 가입 여부가 드러나지 않게 한다
- 푸시 구독 주소는 알려진 브라우저 푸시 서비스 호스트만 받는다(SSRF 방지). 링크는 http(s)만
- Vercel 응답 헤더: nosniff, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy

### 미디어 파이프라인
1. 브라우저가 사진을 긴 변 2048px JPEG + 800px 썸네일로 줄이고 EXIF 촬영 시각을 읽는다(`images.ts`, exifr). 동영상은 다시 인코딩하지 않고 첫 장면 썸네일·길이·촬영 시각만 만든다(`videos.ts`, iOS는 `com.apple.quicktime.creationdate` 우선)
2. 파일 지문(크기 + 앞뒤 1MB SHA-256)으로 앨범에 이미 있는 파일은 건너뛴다(서버도 앨범 안에서 유일)
3. `POST /api/albums/:id/photos/uploads` → presigned PUT(10분) → R2 PUT → `POST /api/albums/:id/photos`(서버가 HEAD로 확인). 한 개씩 바로 등록, 실패하면 `withRetry`로 두 번 더, 업로드 중 Screen Wake Lock
4. 응답의 URL은 서명 GET URL(6일 구간 고정, 7일 유효 → URL이 안 바뀌어 브라우저 캐시 유지)
5. 등록되지 않은 R2 객체는 하루 한 번 `orphans.ts`가 지운다(하루 넘은 것만)

### 프론트엔드 구조
- `MapsProvider`(`lib/maps.tsx`)가 Google Maps JS를 앱 전체에 한 번 로드. 지도 지역·검색 우선 국가·기본 중심은 기기 시간대(없으면 앱 언어)로: 일본이면 JP·도쿄, 아니면 KR·서울(`lib/home.ts`)
- 장소 이름·주소는 앱 언어와 상관없이 그 나라 말로 저장(일본 장소는 일본어)
- React Query `networkMode: offlineFirst` + 서비스 워커 캐시로 오프라인 읽기. 로그아웃·커플 전환 때 `clearOfflineData`
- 디자인 토큰은 Tailwind v4 `@theme`(`index.css`). 디자인·밝기 모드는 `<html data-theme / data-mode>`의 CSS 변수 교체로 구현해서 컴포넌트가 거의 분기하지 않는다
- 화면 코드 분할: 보조 화면은 lazy 로드, 라이브러리는 `vendor` 청크(exifr·motion 제외, `vite.config.ts`)

## 4. 기술 선택 이유

| 선택 | 이유 |
|---|---|
| 1GB VM 한 대(Node+PG+Nginx) | 비용. Google Cloud 무료 체험 → Always Free `e2-micro`(미국 리전)로 옮길 예정. 그래서 메모리 절약이 모든 백엔드 결정의 전제 |
| 브라우저 → R2 직접 업로드 | 서버 메모리·대역폭을 쓰지 않으려고. 동영상(최대 5GB)도 서버를 안 거친다 |
| Cloudflare R2 | 저장 10GB 무료, 송신료 없음 |
| `aws4fetch`(AWS SDK 대신) | SDK가 무겁다. SigV4 서명만 필요 |
| 별도 워커 없이 API 안의 타이머 | 프로세스 하나만 띄우기 위해 |
| Express 5 + Zod | 단순·가벼움, 요청 검증과 환경 변수 검증을 같은 도구로 |
| Prisma 7 + `prisma-client` 생성기 + `@prisma/adapter-pg` | 타입 안전 쿼리, ESM 출력, Rust 엔진 대신 pg 드라이버 어댑터 |
| 이메일+비밀번호, JWT 쿠키 | 두 사람만 쓰는 앱이라 OAuth가 과함. 쿠키는 SameSite=Lax라 API를 같은 사이트(Vercel rewrite)로 부른다 |
| 짝꿍 발급 재설정 코드 | 메일 없이도 비밀번호를 되찾게. 커플 앱이라 상대는 대개 로그인돼 있다(한계는 `docs/password-reset.md`) |
| Resend(`fetch`로 HTTP API) | 무료 플랜, SDK 불필요 |
| 웹 푸시(VAPID, `web-push`) | 네이티브 앱 없이 알림. iPhone은 홈 화면에 추가한 PWA에서만 |
| React 19 + Vite + Tailwind v4 | 빠른 개발. 토큰 기반 테마로 디자인 세 벌·어두운 모드를 CSS 변수로 처리 |
| TanStack Query | 서버 상태 캐시, 낙관적 갱신, 오프라인 우선 모드 |
| Node 내장 테스트 러너 + 실제 PostgreSQL | 추가 의존성 없이, mock 대신 실제 DB로 커플 격리·제약을 검증 |
| Vitest(프론트는 `src/lib` 순수 로직만) | 화면 테스트 없이 핵심 계산만 빠르게 |

## 5. 환경 변수 (이름만, 값은 `.env`에만)

- backend `.env`: `DATABASE_URL`, `HOST`, `PORT`, `CORS_ORIGINS`, `SESSION_SECRET`, `TRUST_PROXY`, `SIGNUP_ENABLED`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`, `BACKUP_R2_BUCKET`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, `ADMIN_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (+ 백업 스크립트용 `BACKUP_KEEP_DAYS`, `BACKUP_DB_CONTAINER`). 테스트는 `TEST_DATABASE_URL`
- frontend `.env.local`: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`, `VITE_GOOGLE_MAPS_MAP_ID_RETRO`, `VITE_GOOGLE_MAPS_MAP_ID_SCRAP`, `VITE_API_URL`(비우면 같은 사이트 `/api`)
- GitHub Actions(배포): 변수 `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_RESTART_COMMAND`, 시크릿 `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`

## 6. API 개요 (자세한 동작은 `CLAUDE.md`의 "API" 절)

| 경로 | 미들웨어 | 내용 |
|---|---|---|
| `/health` | 없음 | 헬스 체크(배포 후 확인) |
| `/api/auth/*` | 일부 `requireAuth` | signup·login·logout·me·avatar·password·forgot/reset-password·계정 삭제 |
| `/api/couple/*` | `requireAuth` | 커플 생성·합류·조회·기념일 수정·reset-code·leave·partner·storage·export |
| `/api/push/*` | `requireAuth` | VAPID 키, 구독, 테스트 |
| `/api/client-errors` | 없음(IP 제한) | 브라우저 오류 보고 |
| `/api/places`, `/api/records`, `/api/albums`, `/api/memories`, `/api/recap` | `requireAuth` + `requireCouple` | 커플 데이터 |

에러 응답 `{ error, code }`. 프론트는 `code`로 분기(`UNAUTHENTICATED`, `COUPLE_REQUIRED`, `INVALID_CREDENTIALS`, `PLACE_EXISTS`, `ALBUM_EXISTS`, `PHOTO_EXISTS`, `NOT_WRITER`, `ENDS_BEFORE_START`, `SIGNUP_CLOSED`, `STORAGE_DISABLED`, `MAIL_DISABLED`, `PUSH_DISABLED`, `INVALID_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INTERNAL` 등). 401을 받으면 프론트는 로그아웃 처리하므로 "현재 비밀번호 틀림" 같은 건 400(`WRONG_PASSWORD`)을 쓴다.

## 7. 디자인 원본

Figma 파일 `7Qc5QDKQEeFWbnAeSbhEA7` — 지도 `1:797`, 캘린더 `1:538`, 앨범 `1:329`, 일정 등록 `1:2`, 장소 상세 `17:1531`, 장소 수정 `17:1598`, 일정 수정 `17:1684`, 앨범 상세 `17:1807`. 도트·스크랩북 디자인과 데스크톱·태블릿 레이아웃은 Figma 이후 코드에서 만들어졌다(원본은 기본 디자인 폰 화면).

## 8. 인프라·운영 요약

- 프론트: Vercel, Root Directory `frontend`, `vercel.json`이 `/api/*`를 API로 rewrite하고 SPA 폴백
- 백엔드: Ubuntu 22.04 VM, systemd 등으로 API 프로세스 하나(`daty-api`), Nginx 리버스 프록시, certbot
- DB: 같은 VM의 Docker 컨테이너 `date_app_postgres`(compose는 서버 `~/app-db/`), `127.0.0.1:5432`만 열림. 로컬에서 운영 DB에 붙을 일이 있으면 SSH 터널(사람이 직접, 에이전트는 붙지 않는다)
- 백업: 매일 cron `backup.mjs` → 백업 전용 R2 버킷 `backups/`(그 버킷에만 쓸 수 있는 토큰), 14일 보관, 실패 시 관리자 메일
- 오류 알림: API 500과 브라우저 오류를 종류별 한 시간에 한 통 관리자 메일
- 배포·백업 복원·서버 이전 절차: `docs/operations.md`

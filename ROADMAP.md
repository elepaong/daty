# ROADMAP.md — 현재 상태와 다음 할 일

기준일: 2026-11-27, `main` = `9e54e41`(PR #65 병합). 열린 PR·이슈 없음.

표기: ✅ 끝남 · 🟡 일부만 · ⬜ 아직 · 🔍 확인 필요(문서·코드에서 근거를 찾지 못해 사람에게 물어봐야 함)

---

## 1. 현재 진행 상황

핵심 기능은 모두 운영 중이다. 자세한 목록은 `PROJECT_CONTEXT.md` 2절.

| 영역 | 상태 |
|---|---|
| 지도/저널, 장소 상세·수정·메모·방문 기록 | ✅ |
| 캘린더(일정·기록·데이트 코스·기념일) | ✅ |
| 앨범(하루·기간·월별, 사진·동영상, 표지·캡션·순서·이동·저장, 연도·검색) | ✅ |
| 반응·댓글, 웹 푸시(짝꿍 활동·아침 알림) | ✅ |
| N년 전 오늘, 연말 결산(공유 이미지) | ✅ |
| 계정(로그인·커플·비밀번호 변경·재설정 두 방식·프로필 사진·나가기·삭제·내보내기) | ✅ |
| 한국어/일본어, 디자인 세 벌 × 밝기 모드, 폰·태블릿·데스크톱 | ✅ |
| 오프라인 읽기(서비스 워커) | ✅ 읽기만. 오프라인 쓰기는 없음 |
| CI(프론트 lint/test/build, 백엔드 build/test) | ✅ |
| 백엔드 자동 배포(`deploy-backend.yml`) | 🟡 워크플로는 있음. `DEPLOY_HOST` 변수가 있어야 켜지고, 실제 서버로 처음부터 끝까지 돌려 본 기록이 문서에 없음. 11-14에 한 번 백엔드 배포가 실패한 적이 있다(`1b96017`) |
| DB 백업(전용 R2 버킷, cron) | ✅ 코드·문서. 🔍 운영 서버에 전용 버킷으로 옮겼는지, 사진 버킷의 예전 `backups/`를 지웠는지 |
| 서버 이전(무료 체험 → Always Free e2-micro) | ⬜ 절차만 문서화(`docs/operations.md`). 🔍 체험 크레딧 종료일 |

## 2. 미완성·알려진 빈틈

### 운영
1. ⬜ **서버 이전** — Google Cloud 무료 체험 크레딧이 끝나기 전에 `us-west1`/`us-central1`/`us-east1`의 `e2-micro`로. 순서: 새 VM → 스왑·Node 22·Docker·Nginx·certbot → 백업 복원 → `.env` 이전 → DNS → 며칠 뒤 옛 VM·디스크·고정 IP 삭제(남기면 과금). 대안: Oracle Cloud Always Free(서울·도쿄 리전)
2. 🟡 **배포 워크플로 첫 실행 확인** — Actions에서 `Run workflow` 수동 실행으로 검증, sudoers에 재시작 명령만 허용
3. 🔍 `TRUST_PROXY`가 운영 `.env`에서 실제 경로(Vercel rewrite면 2)와 맞는지
4. 🔍 R2 버킷 CORS에 `GET`이 들어갔는지(없으면 "모두 저장"이 iframe 방식으로 떨어진다)

### 문서 불일치
5. ⬜ `README.md`/`README.ja.md`의 "디자인 두 벌" → 세 벌(스크랩북 추가 반영 안 됨)
6. ⬜ CI 설명: `docs/operations.md`는 "프론트 lint·build"라고 쓰지만 `ci.yml`은 `npm test`도 돌린다
7. ✅ `CLAUDE.md`와 `AGENTS.md`의 역할 정리: 규칙은 `AGENTS.md`, `CLAUDE.md`는 `@AGENTS.md`를 가져오고 상세 레퍼런스만(`MIGRATION.md` 5절)

### 코드 정리 후보 (동작 변경 없음, 급하지 않음)
8. ⬜ 프론트 `src/lib/types.ts`의 `TipType`은 예전 `tipType` 컬럼 이름이 남은 것. 지금은 메모 태그 토큰 뜻으로만 쓰인다 — 이름만 정리할지 검토
9. ⬜ 프론트(TypeScript ~6.0)와 백엔드(~7.0) TypeScript 버전이 다르다. 프론트도 7로 올릴지(Dependabot 메이저 PR을 기다리거나 직접)
10. ⬜ 프론트·백엔드가 같이 쓰는 API 타입이 `frontend/src/lib/types.ts`에 손으로 맞춰져 있다. `CLAUDE.md`의 방침대로 `shared/`로 분리를 검토(빌드·배포 경로가 패키지별로 독립이라 설정 비용 확인 필요)

### 테스트
11. ⬜ 프론트 화면 테스트·E2E가 없다(Vitest는 `src/lib` 순수 로직만). 업로드·저장·오프라인처럼 브라우저별로 깨지기 쉬운 흐름에 Playwright 스모크 테스트를 검토(Google Maps 키와 R2가 필요한 부분은 mock 필요)
12. ⬜ 서비스 워커(`public/sw.js`)는 테스트가 없다

## 3. 향후 개발 계획 (제안, 우선순위 순)

> 아래는 저장소에 남은 근거(커밋·문서·코드 구조)로부터의 **제안**이다. 사용자가 정한 계획이 아니므로, 착수 전에 사용자에게 확인한다.

| 우선 | 항목 | 이유 / 메모 |
|---|---|---|
| 1 | 서버 이전 + 배포 워크플로 실검증 | 비용(크레딧 종료) 직결. 이전 직후 백업·복원도 한 번 리허설 |
| 2 | README·operations 문서 불일치 수정 | 5, 6번. 작은 docs PR |
| 3 | 오프라인 쓰기(일정·메모 대기열) | 지금은 읽기만. 서비스 워커 Background Sync 또는 React Query 일시 중지 뮤테이션 재개. 충돌 처리(두 사람이 같은 기록 수정) 설계가 먼저 |
| 4 | 업로드 흐름 E2E 스모크 | iOS·Android에서 반복적으로 깨졌던 영역 |
| 5 | 공유 타입(`shared/`) | API 변경 때 프론트·백엔드 불일치 방지(교훈: `1b96017`) |
| 6 | 저장 공간 관리 | R2 10GB 무료 한도. 동영상이 원본 그대로 올라가므로 사용량 경고 기준·큰 동영상 안내 강화 검토(앱 차원 한도는 지금 없음) |

### 새 기능을 넣을 때 확인 목록
- [ ] 커플 데이터면 `requireAuth` + `requireCouple`, 모든 쿼리에 `coupleId`, `couple-scope.test.ts`에 경우 추가
- [ ] 스키마 변경은 `prisma migrate dev`로 마이그레이션 파일 생성·커밋
- [ ] 새 에러 코드 → `messages.ts`의 `errors`(ko·ja)
- [ ] 문구 ko·ja, 색은 토큰, 세 디자인 × 밝기 모드에서 확인, 폰·태블릿(736px)·데스크톱(1024px)
- [ ] 44px 터치 영역, 모달은 `useDialogFocus`, 확인은 `useConfirm`
- [ ] API 응답 모양을 바꾸면 프론트가 옛 응답도 처리
- [ ] 짝꿍에게 알릴 일이면 `notifyPartner`(테스트에서는 `pushOutbox`)
- [ ] 동작이 바뀌면 `CLAUDE.md`(상세)·`PROJECT_CONTEXT.md` 갱신, 규칙이 바뀌면 `AGENTS.md`
- [ ] `frontend`: lint·test·build, `backend`: build·test

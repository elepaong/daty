# MIGRATION.md — Claude Code에서 OpenAI Codex로 옮기기

이 문서는 2026-11-27 기준으로 daty의 Claude Code 작업 환경을 조사해서, Codex에서 같은 방식으로 개발을 이어 가는 데 필요한 설정을 정리한 것이다.

> **확인 필요:** Codex 설정 형식(`config.toml`의 `mcp_servers`, `hooks.json`, Skills 폴더)은 Codex 공식 문서([Config reference](https://developers.openai.com/codex/config-reference), [Hooks](https://developers.openai.com/codex/hooks), [Sample config](https://developers.openai.com/codex/config-sample))의 검색 요약을 바탕으로 썼다. 작업 환경에서 그 페이지를 직접 열 수 없어서 키 이름까지 대조하지는 못했다. 그래서 설정 파일은 모두 `*.example.*` 이름으로 두었다. 적용하기 전에 공식 문서와 한 번 대조한다.

---

## 1. 지금 있는 Claude Code 설정 조사 결과

| 대상 | 있음? | 내용 |
|---|---|---|
| `CLAUDE.md`(루트) | ✅ | (이전 당시) 28KB 한국어 명세: 구조, 스택, 디자인 규칙, 인프라, 데이터 모델, API 전체, 업로드 패턴, 작업 규칙. **Claude 전용 문법은 없다**(`@import`, 슬래시 명령 같은 것 없음) |
| `.claude/` 디렉터리(저장소) | ❌ | 없다. git 이력에도 없다 → 저장소에 settings.json, commands, agents, hooks, skills가 없다 |
| `.mcp.json` | ❌ | 없다 |
| `frontend/CLAUDE.md` 등 하위 폴더 메모리 | ❌ | 없다(`frontend/README.md`는 일반 문서) |
| Claude Code 계정 메모리(이 저장소) | ❌ | 비어 있다 |
| 클라우드 세션 하네스 설정(`~/.claude/`, 저장소 밖) | ⚠️ 프로젝트 것이 아님 | Claude Code 클라우드 컨테이너가 자동으로 넣는 것: Stop hook(턴 끝에 커밋·푸시 안 된 작업 확인), SessionStart hook(세션 설정 실패 알림), 권한 deny 목록(하네스 파일 보호). 프로젝트가 만든 설정이 아니다 |
| claude.ai 커넥터(MCP, 계정 단위) | ⚠️ 계정 것 | GitHub, Figma, Vercel, Cloudflare, Gmail, Google Drive·Calendar, Notion, Slack, Canva, Scenario. 이 중 프로젝트 작업에 쓰는 것은 GitHub·Figma·Vercel·Cloudflare |
| 커밋·PR 관례 | ✅ | 브랜치 `claude/<이름>`, 커밋 끝에 `Co-Authored-By: Claude …`, `Claude-Session: …` 트레일러, PR 본문 끝에 "Generated with Claude Code" |

결론: **옮길 "설정 파일"은 거의 없고, 옮길 것은 대부분 `CLAUDE.md`에 적힌 규칙과 지식이다.**

---

## 2. 재사용 / 변환 / 버림 구분

### 그대로 재사용
| 항목 | 방법 |
|---|---|
| `CLAUDE.md`의 내용 | 버린 내용은 없다. 규칙은 `AGENTS.md`로 옮기고, 설계 맥락은 `PROJECT_CONTEXT.md`로 정리했다. API·데이터 모델·업로드·인프라·프론트 세부 동작은 `CLAUDE.md`에 그대로 남겨 상세 레퍼런스로 쓴다(AGENTS.md가 가리킴). 5절 참고 |
| `docs/operations.md`, `docs/password-reset.md`, README | 도구와 무관. 그대로 |
| CI(`ci.yml`), 배포(`deploy-backend.yml`), Dependabot | 도구와 무관. 그대로 |
| 빌드·테스트 명령, 로컬 DB(`compose.yaml`) | 그대로. `AGENTS.md` 2절 |
| Skills 형식(`SKILL.md` + `name`/`description` frontmatter) | Claude Code와 Codex가 같은 형식을 쓴다. 이번에 `.agents/skills/`에 새로 만들었다(아래 4절) |

### 변환해야 함
| Claude Code | Codex | 이번에 만든 파일 |
|---|---|---|
| `CLAUDE.md`(자동 로드) | `AGENTS.md`(자동 로드, 기본 32KiB까지) | `AGENTS.md`(약 15KB). 한글은 글자당 3바이트라 `CLAUDE.md`(28KB)를 통째로 옮기면 한도에 거의 닿는다 → 규칙만 요약 |
| claude.ai 커넥터 / `.mcp.json` | `~/.codex/config.toml` 또는 `.codex/config.toml`의 `[mcp_servers.<이름>]` (stdio는 `command`/`args`, 원격은 `url`) | `.codex/config.example.toml` |
| 클라우드 하네스 Stop hook(git 확인) | Codex hooks의 `Stop` | `.codex/hooks/remind-uncommitted.mjs` + `.codex/hooks.example.json` |
| (없던 것) `CLAUDE.md`의 "금지" 규칙 | Codex hooks의 `PreToolUse`(Bash) | `.codex/hooks/guard-bash.mjs`: `prisma db push`, `prisma migrate reset`, 강제 푸시, `main` 푸시, `.env` add를 막는다 |
| 하네스 권한 설정 | Codex 샌드박스·승인 정책(`sandbox_mode`, `approval_policy`) | 개인 설정. 권장값은 3절 |
| 커밋 트레일러·브랜치 이름 `claude/*` | 사람이 정한다 | 권장: 브랜치 `codex/<설명>` 또는 `feat/…`·`fix/…`, Claude 트레일러는 붙이지 않는다 |
| 내장 명령 `/init`, `/code-review`, `/security-review` | Codex `/init`(AGENTS.md 생성), `/review` | 따로 설정할 것 없음. `/init`은 이미 있는 AGENTS.md를 덮어쓸 수 있으니 쓰지 않는다 |
| 서브에이전트(Explore, Plan 등 내장) | Codex 서브에이전트([문서](https://developers.openai.com/codex/subagents/)) | 프로젝트에 정의된 커스텀 에이전트가 없어서 옮길 것 없음 |

### 버림 (Codex에 대응물이 필요 없음)
- Claude Code 계정 메모리(이 저장소는 비어 있음) → 오래 남길 사실은 `AGENTS.md`·`ROADMAP.md`에 쓴다
- 하네스 SessionStart hook(클라우드 컨테이너 설정 실패 알림), 하네스 파일 보호 권한 → Claude 클라우드 전용
- Gmail, Google Drive·Calendar, Notion, Slack, Canva, Scenario 커넥터 → 이 프로젝트 작업에 쓰인 흔적이 없다. 필요하면 개인 `~/.codex/config.toml`에 추가
- Cloudflare "Workers Bindings" MCP → 이미 deprecated. Codex에서는 새 주소(`https://mcp.cloudflare.com/mcp`)를 쓴다

---

## 3. 적용 순서

### 3-1. 저장소 받기와 확인
```bash
git clone https://github.com/elepaong/daty.git
```
```bash
cd daty && wc -c AGENTS.md
```
`AGENTS.md`가 32768바이트보다 작아야 잘리지 않는다.

### 3-2. 프로젝트 설정 켜기
```bash
cp .codex/config.example.toml .codex/config.toml
```
```bash
cp .codex/hooks.example.json .codex/hooks.json
```
- 프로젝트 `.codex/` 설정과 hook은 Codex가 이 프로젝트를 trusted로 표시해야 읽힌다. Codex CLI에서 `/hooks`로 hook을 검토하고 trust한다
- `.codex/config.toml`과 `.codex/hooks.json`을 커밋할지는 팀(=사용자) 판단. 비밀 값은 들어 있지 않다. 개인마다 다르게 쓸 거면 `.gitignore`에 추가한다
- hook 스크립트는 Node만 쓴다(프로젝트가 이미 Node 22 필요). macOS·Linux 모두 동작. 직접 시험:
  ```bash
  echo '{"tool_input":{"command":"npx prisma db push"}}' | node .codex/hooks/guard-bash.mjs; echo "exit=$?"
  ```
  `exit=2`와 차단 이유가 나오면 정상이다
- 같은 스크립트는 Claude Code hook으로도 쓸 수 있다(stdin의 `tool_input.command`가 같다)

### 3-3. MCP 로그인
- GitHub: 저장소 `elepaong/daty`만 권한을 준 fine-grained PAT를 만들고 셸에 `GITHUB_PAT` 환경 변수로 둔다(파일에 쓰지 않는다)
- Figma·Vercel·Cloudflare: OAuth
  ```bash
  codex mcp login figma
  ```
  `vercel`, `cloudflare`도 같은 방식이다
- 확인
  ```bash
  codex mcp list
  ```

### 3-4. 권장 승인·샌드박스 (개인 `~/.codex/config.toml`)
- 평소 작업: 작업 폴더 쓰기 허용 + 네트워크·폴더 밖 쓰기는 승인 요청(Codex의 workspace-write 계열 모드)
- 운영 서버 SSH, 운영 DB 터널, `git push`는 항상 사람이 승인한다
- 정확한 키 이름(`sandbox_mode`, `approval_policy`)과 값은 공식 config reference로 확인

### 3-5. Codex 클라우드에서 쓸 때 (환경 설정)
- 환경의 setup script 예:
  ```bash
  cd frontend && npm ci && cd ../backend && npm ci
  ```
- 네트워크: npm 레지스트리, (Google Maps를 확인한다면) `maps.googleapis.com`. API 키 값은 환경의 secret으로 넣고 문서에 쓰지 않는다
- **백엔드 테스트에는 PostgreSQL이 필요하다.** 클라우드 컨테이너에 Docker가 없으면 `npm run db:up`이 안 된다. 그때는 컨테이너에 PostgreSQL 15를 설치해 띄우고 `TEST_DATABASE_URL`(DB 이름은 `_test`로 끝나야 함)로 가리키거나, 백엔드 테스트는 CI 결과로 확인한다. 어느 쪽인지 작업 보고에 쓴다

---

## 4. 새로 만든 Skills (`.agents/skills/`)

`CLAUDE.md`의 규칙 중 "절차"인 것을 Skills로 뽑았다. Codex는 `.agents/skills/` 아래의 `SKILL.md`를 읽는다(공식 문서로 경로 확인 필요). Claude Code에서도 쓰려면 `.claude/skills/`로 복사하거나 심볼릭 링크를 건다.

| Skill | 내용 | 원본 |
|---|---|---|
| `verify-changes` | 패키지별 lint·test·build, Docker 없을 때 보고, lock 파일 되돌리기 | `CLAUDE.md` 작업 규칙, `ci.yml` |
| `db-schema-change` | 스키마 수정 → `migrate dev` → CHECK 손으로 → 운영 금지 명령 | `CLAUDE.md` 데이터 모델 끝 문단 |
| `add-ui-text` | `messages.ts` ko·ja, 에러 코드 문구 | `CLAUDE.md` 한국어/일본어, API 에러 응답 |
| `new-couple-route` | `requireCouple`, `coupleId` 범위, `couple-scope.test.ts` | `CLAUDE.md` API, 작업 규칙 |
| `ui-design-conventions` | 토큰·세 디자인·밝기 모드·반응형·접근성 | `CLAUDE.md` frontend 절 |

---

## 5. 문서 역할 (적용 완료)

권장안대로 정리했다.

| 파일 | 역할 | 누가 읽나 |
|---|---|---|
| `AGENTS.md` | **규칙의 원본**: 구조, 스택, 빌드·테스트, Git·PR, 백엔드·프론트 컨벤션, 금지 사항, Skills 목록 | Codex(자동), Claude Code(`CLAUDE.md`의 `@AGENTS.md`로 자동) |
| `CLAUDE.md` | 맨 위 `@AGENTS.md` + **상세 레퍼런스**: 프론트 세부 동작, 인프라, 데이터 모델, API, 이미지 업로드 패턴. 규칙은 다시 쓰지 않는다 | Claude Code(자동), Codex(AGENTS.md가 가리켜서 필요할 때) |
| `PROJECT_CONTEXT.md` | 목적·아키텍처·기술 선택 이유 | 둘 다 |

- `CLAUDE.md`에서 뺀 것은 `AGENTS.md`와 겹치던 규칙(디자인 토큰·세 디자인·밝기 모드·접근성·다국어·모달·확인창·반응형 기준·ESM·작업 규칙)뿐이다. 거기에만 있던 세부(데스크톱에서 장소 상세가 열리는 자리, 언어·디자인 토글 위치, 스크랩북 팔레트, Maps·서비스 워커·저장 동작, 개발 프록시, Figma 노드)는 `CLAUDE.md` "프론트엔드 세부 동작"에 남겼다
- 규칙을 바꿀 때는 `AGENTS.md`, 동작·API를 바꿀 때는 `CLAUDE.md`를 고친다
- Codex로 완전히 옮긴 뒤 Claude Code를 더 쓰지 않으면, `CLAUDE.md`의 상세를 `docs/reference.md` 같은 이름으로 옮기고 `AGENTS.md`의 링크를 바꾼 뒤 `CLAUDE.md`를 지워도 된다

---

## 6. 넘겨받는 에이전트를 위한 확인 목록

- [ ] `AGENTS.md` → `PROJECT_CONTEXT.md` → `ROADMAP.md` 순서로 읽었다
- [ ] 로컬에서 `frontend`의 lint·test·build, `backend`의 build·test가 통과한다(또는 못 돌린 이유를 안다)
- [ ] `.env`, `.env.local` 값은 사용자에게 받았다(문서·커밋에 쓰지 않는다)
- [ ] 브랜치에서 작업하고 PR로 병합한다. `main` 직접 푸시 금지
- [ ] 운영 서버·운영 DB에는 붙지 않는다. 배포는 `main` 병합 → GitHub Actions

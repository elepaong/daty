---
name: verify-changes
description: daty에서 커밋·PR 전에 바뀐 패키지의 빌드·린트·테스트를 CI와 같은 순서로 돌리고 결과를 정직하게 보고한다. 코드를 바꾼 뒤 "확인해 줘", "커밋해 줘", "PR 올려 줘" 직전에 쓴다.
---

# 바뀐 코드 검증

1. 바뀐 파일 확인: `git status --short`, `git diff --stat origin/main...`
2. `frontend/`가 바뀌었으면 (`frontend/`에서):
   ```bash
   npm ci        # node_modules가 없을 때만. lock 파일을 바꾸지 않는다
   npm run lint
   npm test
   npm run build
   ```
3. `backend/`가 바뀌었으면 (`backend/`에서):
   ```bash
   npm ci        # node_modules가 없을 때만 (postinstall이 Prisma Client를 생성)
   npm run db:up # Docker 필요. 테스트 DB daty_test를 이 컨테이너 안에 만든다
   npm run build
   npm test
   ```
   - Docker가 없으면 `npm run build`까지만 하고 "백엔드 테스트는 Docker가 없어 실행하지 못함"이라고 보고한다
   - 다른 PostgreSQL을 쓰려면 `TEST_DATABASE_URL`(DB 이름이 `_test`로 끝나야 함)
4. 문서만 바뀌었으면 빌드는 생략할 수 있다. 생략했다고 보고한다
5. `git diff --stat`에 `package-lock.json`이 있는데 의존성을 바꾸지 않았다면 `git checkout -- <패키지>/package-lock.json`으로 되돌린다
6. 실패하면 출력의 핵심 줄을 그대로 보여 주고 고친다. **테스트를 건너뛰거나 지우거나 `skip`으로 바꿔서 통과시키지 않는다**
7. 보고: 패키지별로 lint / test / build 통과·실패·미실행(이유)

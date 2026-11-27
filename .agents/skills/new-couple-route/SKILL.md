---
name: new-couple-route
description: daty 백엔드에 커플 소유 데이터(장소·기록·앨범·사진·메모 등)를 다루는 API 엔드포인트를 새로 만들거나 바꿀 때 쓴다. 범위 제한, 검증, 에러 코드, 격리 테스트 절차.
---

# 커플 데이터 API 추가

1. 라우터는 `backend/src/modules/<영역>.routes.ts`. 새 파일이면 `src/app.ts`에서 `api.use("/<경로>", requireAuth, requireCouple, <router>)`로 연결
2. 상대 import에 `.js`: `import { prisma } from "../lib/prisma.js"`
3. 입력은 zod로 검증: 본문 `z.object({...}).parse(req.body)`, id는 `idParam.parse(req.params)`, 링크는 `webUrl()`(`src/lib/http.ts`)
4. **모든 쿼리에 `coupleId: req.coupleId`.** 단건은 `findFirst({ where: { id, coupleId } })` 후 없으면 `throw new HttpError(404, "Not Found", "NOT_FOUND")`. 연결 대상(다른 앨범·장소)도 같은 커플인지 확인
5. 업무 오류는 `HttpError(status, "English message", "CODE")`. 프론트 문구는 `add-ui-text` skill
6. 파일이 관련되면 multipart를 만들지 않는다: presigned URL 발급 → 클라이언트가 R2 PUT → 키를 받아 HEAD 확인 후 기록(`src/lib/storage.ts`). 키 형식을 검사한다
7. 짝꿍에게 알릴 일이면 `notifyPartner`(`src/lib/push.ts`)
8. 테스트(`backend/test/`): 헬퍼 `resetDatabase`, `startServer`, `Client`, `coupleMember`(`test/helpers.ts`)
   - 정상 동작 테스트를 영역 파일에 추가
   - **`test/couple-scope.test.ts`에 다른 커플의 id로 접근하면 404인 경우를 추가**
9. `CLAUDE.md`의 API 절과 `PROJECT_CONTEXT.md` 6절을 갱신
10. `npm run build && npm test`

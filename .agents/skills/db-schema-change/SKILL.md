---
name: db-schema-change
description: daty 백엔드의 Prisma 스키마(backend/prisma/schema.prisma)를 바꾸고 마이그레이션 파일을 만들 때 쓴다. 컬럼·테이블·enum·제약 추가나 변경, 시드 수정 포함.
---

# Prisma 스키마 변경

전제: 로컬 개발 DB(`backend/compose.yaml`, `localhost:5433`, DB `daty_dev`)만 쓴다. **운영 DB에는 붙지 않는다.**

1. `backend/prisma/schema.prisma` 수정
   - 모델 PascalCase, 필드 camelCase + `@map("snake_case")`, 테이블 `@@map("복수_snake_case")`
   - 커플 데이터면 `coupleId Int @map("couple_id")` + `couple Couple @relation(..., onDelete: Cascade)`
   - 선택 필드가 예전 행에 없을 수 있으면 nullable로 두고 응답에서 기본값을 채운다(예: `albumEndDate`, `sizeBytes`)
2. 마이그레이션 생성 (`backend/`에서):
   ```bash
   npm run db:up
   npm run db:migrate -- --name <짧은_설명>   # prisma migrate dev
   ```
3. Prisma가 표현 못 하는 제약(CHECK 등)은 생성된 `prisma/migrations/<타임스탬프>_<이름>/migration.sql`에 손으로 추가한다. 예: 평점 1~5, `ends_at > scheduled_at`, 댓글·반응은 `photo_id`/`note_id` 중 하나만
4. 데이터를 옮겨야 하면 같은 SQL에 `UPDATE`/`INSERT ... SELECT`를 넣는다(예: bar → FOOD, tipText → place_notes)
5. 생성물 `src/generated/prisma`는 커밋하지 않는다. 마이그레이션 폴더와 스키마는 커밋한다
6. 시드(`prisma/seed.ts`)가 새 필드를 써야 하면 고친다. 다시 넣기: `npx prisma db seed -- --reset`(DB 이름이 `_dev`일 때만)
7. 라우터 zod 스키마·응답·프론트 `src/lib/types.ts`를 맞춘다. 응답 모양이 바뀌면 프론트가 옛 응답도 처리하게(백엔드 배포가 늦을 수 있다)
8. `npm run build && npm test`
9. 절대 금지: 운영 DB에 `prisma migrate dev`, `prisma db push`, `prisma migrate reset`. 운영에는 배포 워크플로가 `npx prisma migrate deploy`만 실행한다

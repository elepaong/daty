---
name: add-ui-text
description: daty 프론트엔드에 화면 문구, 버튼 이름, 안내문, 에러 메시지를 추가하거나 바꿀 때 쓴다. 한국어·일본어 사전(messages.ts)과 백엔드 에러 코드 연결 포함.
---

# 화면 문구 추가 (ko / ja)

1. `frontend/src/lib/messages.ts`의 `ko` 객체 알맞은 그룹에 키를 추가한다
2. 같은 위치의 `ja`에도 반드시 추가한다. `ja`는 `Messages` 타입이라 빠지면 `npm run build`가 실패한다
3. 컴포넌트에서는 `const t = useT()`로 쓴다. 문자열을 JSX에 하드코딩하지 않는다. 함수형 메시지(개수·이름을 받는 것)는 기존 예를 따른다
4. 백엔드에 새 에러 코드(`throw new HttpError(status, "...", "NEW_CODE")`)를 만들었으면 `messages.ts`의 `errors`(ko·ja)에 `NEW_CODE` 문구를 넣는다. 화면은 `errorMessage(err)`(`src/lib/api.ts`)로 보여 준다. 영어 서버 메시지는 화면에 내보내지 않는다
5. 말투: 한국어는 부드러운 해요체(예: "저장하지 못했어요"), 일본어는 です·ます체. 짧게
6. 장소 메모 태그(`{{EAT}}` `{{SEE}}` `{{DO}}`)의 문구는 `src/lib/memo.ts` 경로로 바뀐다 — 토큰 자체를 문구로 바꾸지 않는다
7. `npm run lint && npm test && npm run build`

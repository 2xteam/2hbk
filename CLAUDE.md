# 작업 전에 읽을 것

이 프로젝트의 배경 지식은 별도의 옵시디언 볼트에 정리되어 있다.

```
로컬:   C:\Dev\my-obsidian-vault
저장소: https://github.com/2xteam/my-obsidian-vault
```

## 먼저 읽기

1. `10-Projects/2hbk.md` — 이 프로젝트의 스택·데이터·현황·결정 사항
2. `00-Meta/AI 협업 규칙.md` — 볼트를 읽고 갱신하는 방법

작업 성격에 따라 추가로:

| 작업 | 노트 |
|---|---|
| 배포·환경 변수·도메인 | `30-Patterns/Vercel 배포 패턴.md`, `40-Infra/도메인과 DNS.md` |
| 이미지 업로드 | `30-Patterns/이미지 업로드 패턴.md`, `40-Infra/Cloudflare R2.md` |
| 로그인·회원·세션 | `30-Patterns/인증과 세션 공유.md` |
| DB 연결 | `40-Infra/MongoDB Atlas.md` |
| 페이지 디자인 | `20-Design/` 전체 |

## 이 프로젝트 메모

- 이름은 **2hbk**로 쓴다. `함히보까`는 설명하는 자리에서만 쓴다
- 이 앱만 **이메일 + 비밀번호**로 로그인한다. 다른 세 앱은 전화번호 + PIN이다
- API는 쿠키의 `id`를 믿지 않는다. 같은 쿠키의 **서명 토큰**만 신뢰한다
  (`lib/sessionToken.ts` · `lib/auth.ts`). 포털과 `SESSION_SECRET`을 공유해야 한다
- 목표·팔로우·초대는 Mongo `_id`가 아니라 **`users.userId` 문자열**을 참조한다.
  이 값을 바꾸면 도메인 데이터 전체가 끊긴다
- DB 이름은 URI 경로가 아니라 `lib/db.ts`에서 `hamhibokka`로 못 박는다

## 작업이 끝나면

바뀐 사실(도메인·DB·진행 상황·새로 발견한 함정)을 볼트의 해당 노트에 반영하고
`updated` 날짜를 올린다. 볼트 수정은 코드와 **별도 커밋**으로 남긴다.

비밀값은 볼트에 쓰지 않는다. 공개 저장소다.

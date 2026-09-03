# 2hbk

함히보까 — 함께 목표를 정하고 스티커를 모아 채우는 기록 도구.
React Native 앱 + NestJS/GraphQL 백엔드를 **Next.js 단독 프로젝트로 이관한 것**이다.

```
운영    https://2hbk.myjane.co.kr
로컬    http://localhost:3004
DB      MongoDB Atlas Cluster0 — 앱 데이터 hamhibokka · 회원 user
```

## 시작하기

```bash
cp .env.example .env.local   # 값을 채운다
npm install
npm run dev                  # http://localhost:3004
```

HTTPS에서만 재현되는 동작(Secure 쿠키·리디렉트)을 볼 때는 `npm run dev:https`.

## 구조

```
app/
  page.tsx              랜딩 (결쩜사 시트 패턴)
  login · register      로컬 개발용 로그인·가입 (운영에서는 포털로 넘긴다)
  (app)/                로그인이 필요한 화면 — AuthGate로 감싼다
    home  goals  goals/new  goals/[goalId]  goals/[goalId]/edit
    friends  invites  users/[userId]  my
  api/                  Route Handler
    auth/login  auth/register
    me  me/profile-image
    goals  goals/[goalId]  .../stickers  .../participants  .../image
    follows  follows/[followId]
    invitations  invitations/[invitationId]
    users  users/[userId]
lib/
  db.ts                 Mongoose 연결 (dbName을 코드에서 고정)
  auth.ts               요청자 확인 — 서명 토큰만 신뢰
  sessionToken.ts       HMAC 서명·검증 (포털과 같은 파일)
  session.ts            통합 세션 쿠키 (네 앱 공유 계약)
  services/             도메인 로직 (goals · follows · invitations · users)
models/                 Mongoose 스키마
scripts/                이관·점검 스크립트
```

## 로그인

`myjane.co.kr` 계열은 회원과 세션을 공유한다. 다만 **로그인 수단이 앱마다 다르다.**

| 앱 | 수단 |
|---|---|
| SnapWord · SnapNote · FitLog | 전화번호 + PIN |
| **2hbk** | **이메일 + 비밀번호** |

운영 도메인에서는 포털(`www.myjane.co.kr/login?from=2hbk`)이 로그인을 맡고,
로컬 개발에서는 이 앱의 `/login`을 쓴다. `localhost`에는 쿠키 도메인이 붙지 않아
포털에 저장한 세션이 돌아와도 읽히지 않기 때문이다.

### API 인증

통합 세션 쿠키(`snap_user`)는 **클라이언트가 읽고 고칠 수 있는 평문 JSON**이다.
그래서 이 앱의 API는 쿠키의 `id`를 믿지 않고, 같은 쿠키에 담긴 **HMAC 서명 토큰**만
검증한다. 포털과 이 앱이 `SESSION_SECRET`을 같은 값으로 공유해야 한다.

남의 목표에 스티커를 붙이고 참가를 승인하는 동작이 있어 꼭 필요하다.
다른 세 앱은 이 필드를 모르므로 기존 세션과 그대로 호환된다.

## 데이터

| 컬렉션 | 내용 |
|---|---|
| `hamhibokka.goals` | 목표 1건 — 참가자와 스티커 적립 로그를 문서 안에 내장 |
| `hamhibokka.follows` | 팔로우 관계 (`followerId` → `followingId`) |
| `hamhibokka.goalinvitations` | 초대(`invite`) · 참가 요청(`request`) |
| `user.users` | 통합 회원 — 공용 필드 + 2hbk 전용(`userId` `nickname` `password` …) |

> **`users.userId`가 도메인 식별자다.** 목표의 `createdBy`·`participants[].userId`,
> 팔로우의 양쪽, 초대의 양쪽이 모두 이 문자열(`user_xxxxxxxxx`)을 참조한다.
> Mongo `_id`가 아니다. 이관할 때 이 값을 보존했기 때문에 도메인 데이터를
> 한 건도 손대지 않았다.

### 목표 방식

방식을 고르면 공개 범위와 승인 방식이 따라온다(`lib/services/goals.ts`).

| 방식 | 공개 범위 | 자동 승인 | 첫 참가자 |
|---|---|---|---|
| `personal` 혼자 하기 | `private` | 예 | 만든 사람 |
| `competition` 겨루기 | `public` | 아니오 | 없음 |
| `challenger_recruitment` 챌린저 모집 | `followers` | 아니오 | 없음 |

## 스크립트

```bash
npm run migrate:dry     회원 이관 계획만 출력
npm run migrate:run     회원 이관 실행 (백업 후)
npm run check:images    DB의 이미지 주소가 살아 있는지 확인 (--clean 으로 정리)
```

## 이관 기록 (2026-09-03)

- `hamhibokka.users` 17건 → `user.users`. `_id`·`userId`·bcrypt 해시를 그대로 보존해
  **기존 비밀번호로 계속 로그인된다.** 원본 컬렉션은 되돌릴 근거로 남겨 두었다
- 이메일이 겹친 1건은 기존 통합 회원과 **병합**했다. 그 계정은 전화번호+PIN과
  이메일+비밀번호 둘 다로 로그인된다
- 목표 12 · 팔로우 7 · 초대 4건은 손대지 않았다
- 옛 Azure 스토리지(`hamhibokkastorage`)가 이미 사라져 **이미지 11건은 옮길 수 없었다.**
  DB의 주소는 남아 있고 화면은 실패한 이미지를 감춘다(`components/SafeImage.tsx`)
- 스티커 지급 권한을 **목표를 만든 사람**으로 제한했다. 옛 백엔드는 로그인만 되어 있으면
  누구든 아무 목표의 아무 참가자에게 스티커를 붙일 수 있었다

## 디자인

결쩜사(`kyulzzumsa.co.kr`) 패턴을 따른다 — 옅은 배경 위에 둥근 시트를 쌓고,
시트마다 `eyebrow → 헤드라인 → 콘텐츠` 순서를 지킨다. 서체는 본문 Pretendard +
헤드라인 Gowun Batang 700. 기본 테마는 라이트(`#fdfbff` / `#7c3aed`).

금색(`#c9a84c`)은 **강조점에만** 쓴다 — 채워진 스티커와 달성 배지뿐이다.

자세한 토큰과 블록은 볼트의 `20-Design/`을 본다.

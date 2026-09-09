import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserModel, type UserDocument } from "@/models/User";
import { verifySessionToken } from "@/lib/sessionToken";
import { readSessionTokenFromRequest } from "@/lib/sessionCookie";

/**
 * 서버에서 요청자를 확인한다.
 *
 * 쿠키 본문의 `id`는 클라이언트가 마음대로 쓸 수 있으므로 **믿지 않는다.**
 * 같은 쿠키 안의 `token`(HMAC 서명)만 신뢰하고, 거기 담긴 `userId`로 회원을 찾는다.
 */



export type Viewer = {
  /** 통합 회원 문서 */
  doc: UserDocument;
  /** 도메인 식별자 — 목표·팔로우·초대가 참조하는 값 */
  userId: string;
  /** 자녀 프로필 세션이면 보호자 `_id`. 앱은 참고만 한다 */
  guardianId: string | null;
};

export async function getViewer(req: Request): Promise<Viewer | null> {
  const claims = verifySessionToken(readSessionTokenFromRequest(req));
  if (!claims) return null;

  await connectDB();
  const User = getUserModel();
  const doc = await User.findOne({ userId: claims.u }).exec();
  if (!doc) return null;

  /*
    탈퇴한 계정은 여기서 막는다. 탈퇴는 **여섯 서비스 공통**이라
    포털에서 닫으면 이 앱도 함께 닫혀야 한다. 쿠키는 30일짜리라
    포털에서 막는 것만으로는 남아 있는 세션이 계속 통한다.
    → myjane/lib/accountLifecycle.ts · 50-Plans/C 법적 페이지.md
  */
  if (doc.withdrawnAt) return null;

  /*
    세션 버전이 다르면 폐기된 토큰이다 (비밀번호 변경·탈퇴·모든 기기 로그아웃).
    `sv` 가 없는 옛 토큰은 아직 한 번도 올리지 않은 계정(0)에서만 통한다.
  */
  if ((claims.sv ?? 0) !== (doc.sessionVersion ?? 0)) return null;


  return { doc, userId: claims.u, guardianId: claims.gid ?? null };
}

/** 로그인이 필요한 라우트에서 쓴다. 실패하면 401 응답을 돌려준다 */
export async function requireViewer(
  req: Request,
): Promise<{ viewer: Viewer } | { error: NextResponse }> {
  let viewer: Viewer | null;
  try {
    viewer = await getViewer(req);
  } catch (e) {
    /*
      SESSION_SECRET 이 없으면 검증기가 던진다. 그대로 두면 본문이 빈 500 이 나가
      화면이 이유를 보여 주지 못한다 — 설정 누락은 이유가 담긴 503 으로 떨어뜨린다.
      (2026-09-09 운영에서 겪었다 → 10-Projects/FitLog.md)
    */
    const message = e instanceof Error ? e.message : "";
    if (/SESSION_SECRET/.test(message)) {
      return {
        error: NextResponse.json(
          { ok: false, error: "서버 설정이 빠졌습니다 (SESSION_SECRET). 운영자에게 알려 주세요." },
          { status: 503 },
        ),
      };
    }
    throw e;
  }
  if (!viewer) {
    return {
      error: NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }
  return { viewer };
}

export function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

export function forbidden(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

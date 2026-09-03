import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserModel, type UserDocument } from "@/models/User";
import { verifySessionToken } from "@/lib/sessionToken";
import { SESSION_KEY } from "@/lib/session";

/**
 * 서버에서 요청자를 확인한다.
 *
 * 쿠키 본문의 `id`는 클라이언트가 마음대로 쓸 수 있으므로 **믿지 않는다.**
 * 같은 쿠키 안의 `token`(HMAC 서명)만 신뢰하고, 거기 담긴 `userId`로 회원을 찾는다.
 */

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const prefix = name + "=";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** 쿠키에서 서명 토큰만 꺼낸다. Authorization 헤더도 함께 받는다 */
function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const raw = readCookie(req, SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

export type Viewer = {
  /** 통합 회원 문서 */
  doc: UserDocument;
  /** 도메인 식별자 — 목표·팔로우·초대가 참조하는 값 */
  userId: string;
};

export async function getViewer(req: Request): Promise<Viewer | null> {
  const claims = verifySessionToken(readToken(req));
  if (!claims) return null;

  await connectDB();
  const User = getUserModel();
  const doc = await User.findOne({ userId: claims.u }).exec();
  if (!doc) return null;

  return { doc, userId: claims.u };
}

/** 로그인이 필요한 라우트에서 쓴다. 실패하면 401 응답을 돌려준다 */
export async function requireViewer(
  req: Request,
): Promise<{ viewer: Viewer } | { error: NextResponse }> {
  const viewer = await getViewer(req);
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

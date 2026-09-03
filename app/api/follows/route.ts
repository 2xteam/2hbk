import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { findMyFollows, requestFollow, toFollowViews } from "@/lib/services/follows";
import { FOLLOW_STATUSES, type FollowStatus } from "@/models/Follow";

export const runtime = "nodejs";

/** 내 팔로우 목록. `?status=pending` 처럼 걸러 볼 수 있다 */
export async function GET(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const statusParam = new URL(req.url).searchParams.get("status") ?? undefined;
    if (statusParam && !FOLLOW_STATUSES.includes(statusParam as FollowStatus)) {
      return badRequest("알 수 없는 상태입니다.");
    }

    const rows = await findMyFollows(userId, statusParam);
    return NextResponse.json({ ok: true, follows: await toFollowViews(rows, userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** 팔로우 걸기 */
export async function POST(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    let body: { userId?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    const target = typeof body.userId === "string" ? body.userId : "";
    if (!target) return badRequest("누구를 팔로우할지 골라 주세요.");

    const follow = await requestFollow(userId, target);
    const [view] = await toFollowViews([follow], userId);
    return NextResponse.json({ ok: true, follow: view }, { status: 201 });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

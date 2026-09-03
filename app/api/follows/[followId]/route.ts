import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { approveFollow, removeFollow, toFollowViews } from "@/lib/services/follows";

export const runtime = "nodejs";

type Params = { params: Promise<{ followId: string }> };

/** 받은 팔로우 요청 승인 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { followId } = await params;
    const follow = await approveFollow(followId, userId);
    const [view] = await toFollowViews([follow], userId);
    return NextResponse.json({ ok: true, follow: view });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

/** 팔로우 끊기 · 요청 취소 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { followId } = await params;
    await removeFollow(followId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

import { NextResponse } from "next/server";
import { notFound, requireViewer, serverError } from "@/lib/auth";
import { checkFollowStatus, findByUserId } from "@/lib/services/users";
import { canView, findGoalsCreatedBy, toGoalViews } from "@/lib/services/goals";

export const runtime = "nodejs";

type Params = { params: Promise<{ userId: string }> };

/** 다른 사람의 프로필 — 그 사람이 만든 목표 중 내가 볼 수 있는 것까지 */
export async function GET(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId: viewerId } = auth.viewer;

    const { userId } = await params;
    const user = await findByUserId(userId);
    if (!user) return notFound("사용자를 찾을 수 없습니다.");

    const follow = await checkFollowStatus(viewerId, userId);

    const created = await findGoalsCreatedBy(userId);
    const visible = [];
    for (const g of created) {
      if (await canView(g, viewerId)) visible.push(g);
    }

    return NextResponse.json({
      ok: true,
      user,
      followStatus: follow.followStatus,
      followId: follow.followId,
      goals: await toGoalViews(visible, viewerId),
    });
  } catch (err) {
    return serverError(err);
  }
}

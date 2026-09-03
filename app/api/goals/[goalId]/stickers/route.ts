import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, requireViewer, serverError } from "@/lib/auth";
import { findGoal, giveSticker, toGoalView } from "@/lib/services/goals";

export const runtime = "nodejs";

type Params = { params: Promise<{ goalId: string }> };

/**
 * 스티커 주기.
 *
 * 목표를 만든 사람만 줄 수 있다. 기존 백엔드는 로그인만 되어 있으면 누구든
 * 아무 목표의 아무 참가자에게 스티커를 붙일 수 있었다 → lib/services/goals.ts
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");
    if (goal.createdBy !== userId) {
      return forbidden("스티커는 목표를 만든 사람만 줄 수 있습니다.");
    }
    if (goal.status !== "active") return badRequest("이미 끝난 목표입니다.");

    let body: { toUserId?: unknown; count?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    const toUserId = typeof body.toUserId === "string" ? body.toUserId : "";
    if (!toUserId) return badRequest("누구에게 줄지 골라 주세요.");

    const count = body.count === undefined ? 1 : Number(body.count);
    if (!Number.isInteger(count) || count === 0 || count < -50 || count > 50) {
      return badRequest("스티커 수는 -50~50 사이의 0이 아닌 정수여야 합니다.");
    }

    const participant = (goal.participants ?? []).find((p) => p.userId === toUserId);
    if (!participant) return badRequest("이 목표에 참가하고 있지 않은 사람입니다.");
    if (count < 0 && (participant.currentStickerCount ?? 0) + count < 0) {
      return badRequest("가진 스티커보다 많이 뺄 수는 없습니다.");
    }

    const updated = await giveSticker(goal, toUserId, count, userId);
    return NextResponse.json({ ok: true, goal: await toGoalView(updated, userId) });
  } catch (err) {
    return serverError(err);
  }
}

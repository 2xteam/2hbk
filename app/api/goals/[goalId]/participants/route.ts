import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, requireViewer, serverError } from "@/lib/auth";
import { findGoal, removeParticipant, toGoalView } from "@/lib/services/goals";
import { requestJoin } from "@/lib/services/invitations";

export const runtime = "nodejs";

type Params = { params: Promise<{ goalId: string }> };

/**
 * 참가하기.
 *
 * 자동 승인이 켜진 목표(또는 내 목표)면 바로 참가자가 되고, 아니면 참가 요청이 만들어져
 * 목표를 만든 사람의 승인을 기다린다.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;

    let message: string | null = null;
    try {
      const body = (await req.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message.trim().slice(0, 200) || null;
    } catch {
      /* 본문 없이 참가만 눌러도 된다 */
    }

    const result = await requestJoin(goalId, message, userId);
    const goal = await findGoal(goalId);

    return NextResponse.json({
      ok: true,
      joined: result.joined,
      goal: goal ? await toGoalView(goal, userId) : null,
    });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

/**
 * 참가자 빼기.
 *
 * 스스로 나가거나, 목표를 만든 사람이 내보낼 수 있다.
 * `?userId=` 를 주지 않으면 자기 자신을 뺀다.
 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");

    const target = new URL(req.url).searchParams.get("userId") ?? userId;
    if (target !== userId && goal.createdBy !== userId) {
      return forbidden("다른 참가자는 목표를 만든 사람만 내보낼 수 있습니다.");
    }

    const updated = await removeParticipant(goal, target, userId);
    return NextResponse.json({ ok: true, goal: await toGoalView(updated, userId) });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

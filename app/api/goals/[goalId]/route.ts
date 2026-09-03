import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, requireViewer, serverError } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getGoalModel, GOAL_MODES, GOAL_VISIBILITIES, type GoalMode, type GoalVisibility } from "@/models/Goal";
import { getGoalInvitationModel } from "@/models/GoalInvitation";
import { canView, findGoal, toGoalView, updateGoal } from "@/lib/services/goals";

export const runtime = "nodejs";

type Params = { params: Promise<{ goalId: string }> };

/** 목표 상세 */
export async function GET(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");
    if (!(await canView(goal, userId))) return forbidden("볼 수 없는 목표입니다.");

    return NextResponse.json({ ok: true, goal: await toGoalView(goal, userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** 목표 수정 — 만든 사람만 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");
    if (goal.createdBy !== userId) return forbidden("목표를 만든 사람만 고칠 수 있습니다.");

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title || title.length > 80) return badRequest("목표 이름은 1~80자로 입력해 주세요.");
    }
    if (body.stickerCount !== undefined) {
      const n = Number(body.stickerCount);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        return badRequest("필요한 스티커 수는 1~500 사이의 정수여야 합니다.");
      }
    }
    if (body.mode !== undefined && !GOAL_MODES.includes(String(body.mode) as GoalMode)) {
      return badRequest("알 수 없는 목표 방식입니다.");
    }
    if (
      body.visibility !== undefined &&
      !GOAL_VISIBILITIES.includes(String(body.visibility) as GoalVisibility)
    ) {
      return badRequest("알 수 없는 공개 범위입니다.");
    }

    const updated = await updateGoal(
      goal,
      {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        description:
          body.description !== undefined ? String(body.description).trim() || null : undefined,
        goalImage: body.goalImage !== undefined ? (body.goalImage as string | null) : undefined,
        stickerCount: body.stickerCount !== undefined ? Number(body.stickerCount) : undefined,
        mode: body.mode !== undefined ? (String(body.mode) as GoalMode) : undefined,
        visibility:
          body.visibility !== undefined ? (String(body.visibility) as GoalVisibility) : undefined,
        autoApprove: typeof body.autoApprove === "boolean" ? body.autoApprove : undefined,
      },
      userId,
    );

    return NextResponse.json({ ok: true, goal: await toGoalView(updated, userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** 목표 삭제 — 만든 사람만. 딸린 초대·요청도 함께 지운다 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");
    if (goal.createdBy !== userId) return forbidden("목표를 만든 사람만 지울 수 있습니다.");

    await connectDB();
    await getGoalModel().deleteOne({ _id: goal._id }).exec();
    await getGoalInvitationModel().deleteMany({ goalId }).exec();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

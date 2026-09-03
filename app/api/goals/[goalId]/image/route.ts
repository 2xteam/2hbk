import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, requireViewer, serverError } from "@/lib/auth";
import { findGoal } from "@/lib/services/goals";
import { isR2Configured, uploadImage } from "@/lib/r2";

export const runtime = "nodejs";

type Params = { params: Promise<{ goalId: string }> };

/** 목표 대표 이미지 올리기 — 만든 사람만 */
export async function POST(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { goalId } = await params;
    const goal = await findGoal(goalId);
    if (!goal) return notFound("목표를 찾을 수 없습니다.");
    if (goal.createdBy !== userId) return forbidden("목표를 만든 사람만 바꿀 수 있습니다.");

    if (!isR2Configured()) {
      return NextResponse.json(
        { ok: false, error: "이미지 저장소가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("이미지 파일이 필요합니다.");

    const url = await uploadImage(file, "goals");
    goal.goalImage = url;
    goal.updatedBy = userId;
    await goal.save();

    return NextResponse.json({ ok: true, goalImage: url });
  } catch (err) {
    return serverError(err);
  }
}

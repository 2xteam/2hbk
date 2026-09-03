import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { GOAL_MODES, GOAL_VISIBILITIES, type GoalMode, type GoalVisibility } from "@/models/Goal";
import {
  createGoal,
  findFeedGoals,
  findGoalsCreatedBy,
  findMyGoals,
  findParticipatedGoals,
  searchGoals,
  toGoalViews,
} from "@/lib/services/goals";

export const runtime = "nodejs";

/**
 * 목표 목록.
 *
 * | scope | 내용 |
 * |---|---|
 * | `mine` | 내가 만든 목표 |
 * | `participated` | 남이 만들었는데 내가 참가한 목표 |
 * | `all` (기본) | 위 둘을 합친 것 |
 * | `feed` | 이어진 사람들이 올린 챌린저 모집 |
 * | `search` | `q`로 제목 찾기 (볼 수 있는 것만) |
 */
export async function GET(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "all";
    const q = url.searchParams.get("q") ?? "";

    const goals =
      scope === "mine"
        ? await findGoalsCreatedBy(userId)
        : scope === "participated"
          ? await findParticipatedGoals(userId)
          : scope === "feed"
            ? await findFeedGoals(userId)
            : scope === "search"
              ? await searchGoals(q, userId)
              : await findMyGoals(userId);

    return NextResponse.json({ ok: true, goals: await toGoalViews(goals, userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** 목표 만들기 */
export async function POST(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 80) return badRequest("목표 이름은 1~80자로 입력해 주세요.");

    const stickerCount = Number(body.stickerCount);
    if (!Number.isInteger(stickerCount) || stickerCount < 1 || stickerCount > 500) {
      return badRequest("필요한 스티커 수는 1~500 사이의 정수여야 합니다.");
    }

    const mode = String(body.mode ?? "personal").toLowerCase();
    if (!GOAL_MODES.includes(mode as GoalMode)) return badRequest("알 수 없는 목표 방식입니다.");

    const visibilityRaw = body.visibility ? String(body.visibility).toLowerCase() : undefined;
    if (visibilityRaw && !GOAL_VISIBILITIES.includes(visibilityRaw as GoalVisibility)) {
      return badRequest("알 수 없는 공개 범위입니다.");
    }

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > 1000) return badRequest("설명은 1000자 이하로 입력해 주세요.");

    const goal = await createGoal(
      {
        title,
        description: description || null,
        goalImage: typeof body.goalImage === "string" ? body.goalImage : null,
        stickerCount,
        mode: mode as GoalMode,
        visibility: visibilityRaw as GoalVisibility | undefined,
        autoApprove: typeof body.autoApprove === "boolean" ? body.autoApprove : undefined,
      },
      userId,
    );

    const [view] = await toGoalViews([goal], userId);
    return NextResponse.json({ ok: true, goal: view }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

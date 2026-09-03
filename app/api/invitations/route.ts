import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { findMyInvitations, inviteToGoal, toInvitationViews } from "@/lib/services/invitations";

export const runtime = "nodejs";

/** 내가 보냈거나 받은 초대·참가 요청 */
export async function GET(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const rows = await findMyInvitations(userId);
    return NextResponse.json({ ok: true, invitations: await toInvitationViews(rows, userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** 내 목표에 누군가를 초대한다 */
export async function POST(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    let body: { goalId?: unknown; toUserId?: unknown; message?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    const goalId = typeof body.goalId === "string" ? body.goalId : "";
    const toUserId = typeof body.toUserId === "string" ? body.toUserId : "";
    if (!goalId || !toUserId) return badRequest("목표와 초대할 사람이 필요합니다.");

    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 200) || null : null;

    const invitation = await inviteToGoal(goalId, toUserId, message, userId);
    const [view] = await toInvitationViews([invitation], userId);
    return NextResponse.json({ ok: true, invitation: view }, { status: 201 });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

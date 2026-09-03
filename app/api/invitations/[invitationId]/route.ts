import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import {
  cancelInvitation,
  respondToInvitation,
  toInvitationViews,
} from "@/lib/services/invitations";

export const runtime = "nodejs";

type Params = { params: Promise<{ invitationId: string }> };

/** 받은 초대·요청에 답하기 (수락 / 거절) */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    let body: { status?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    const status = String(body.status ?? "");
    if (status !== "accepted" && status !== "rejected") {
      return badRequest("수락 또는 거절만 할 수 있습니다.");
    }

    const { invitationId } = await params;
    const invitation = await respondToInvitation(invitationId, status, userId);
    const [view] = await toInvitationViews([invitation], userId);
    return NextResponse.json({ ok: true, invitation: view });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

/** 내가 보낸 초대·요청 취소 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const { invitationId } = await params;
    await cancelInvitation(invitationId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return err instanceof Error ? badRequest(err.message) : serverError(err);
  }
}

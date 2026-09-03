import { NextResponse } from "next/server";
import { requireViewer, serverError } from "@/lib/auth";
import { searchUsersByNickname } from "@/lib/services/users";

export const runtime = "nodejs";

/** 닉네임으로 사람 찾기 */
export async function GET(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { userId } = auth.viewer;

    const q = new URL(req.url).searchParams.get("q") ?? "";
    const users = await searchUsersByNickname(q, userId);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return serverError(err);
  }
}

import { NextResponse } from "next/server";
import { adminApiError, requireAdminSecret } from "@/lib/adminApi";
import { connectDB } from "@/lib/db";
import { getFollowModel } from "@/models/Follow";

export const runtime = "nodejs";

/**
 * 가족 자동 팔로우 — 포털이 자녀 프로필을 만들 때 부른다 (2026-09-07 결정).
 *
 * 보호자와 자녀, 자녀끼리를 **양방향 · 승인 상태**로 묶는다. 이미 있는 관계는 건드리지 않는다.
 * 인증은 통합 admin 과 같은 공유 비밀(`ADMIN_API_SECRET`).
 * → myjane/lib/family.ts · my-obsidian-vault / 50-Plans/F 보호자·자녀 계정.md
 */
export async function POST(req: Request) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  try {
    let body: { userIds?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON 본문이 필요합니다." }, { status: 400 });
    }
    const ids = Array.isArray(body.userIds)
      ? [...new Set(body.userIds.filter((v): v is string => typeof v === "string" && /^user_[a-z0-9]+$/i.test(v)))]
      : [];
    if (ids.length < 2 || ids.length > 12) {
      return NextResponse.json({ ok: false, error: "userIds 는 2~12개여야 합니다." }, { status: 400 });
    }

    await connectDB();
    const Follow = getFollowModel();
    const now = new Date();
    let created = 0;
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const r = await Follow.updateOne(
          { followerId: a, followingId: b },
          {
            $setOnInsert: {
              followerId: a,
              followingId: b,
              status: "approved",
              approvedAt: now,
              createdBy: "system:family",
              updatedBy: "system:family",
            },
          },
          { upsert: true },
        ).exec();
        if (r.upsertedCount) created += 1;
      }
    }
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    return adminApiError(err);
  }
}

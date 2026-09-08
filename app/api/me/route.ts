import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";

export const runtime = "nodejs";

/** 내 프로필 */
export async function GET(req: Request) {
  const auth = await requireViewer(req);
  if ("error" in auth) return auth.error;
  const { doc } = auth.viewer;

  return NextResponse.json({
    ok: true,
    me: {
      userId: doc.userId,
      nickname: doc.nickname ?? doc.name ?? "",
      email: doc.email ?? null,
      profileImage: doc.profileImage ?? null,
      followApprovalRequired: Boolean(doc.followApprovalRequired),
      /** 다른 myjane 앱에서 먼저 가입한 계정이면 전화번호+PIN 로그인도 살아 있다 */
      hasPinLogin: Boolean(doc.pin),
    },
  });
}

/** 닉네임 · 팔로우 승인 설정 바꾸기 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { doc } = auth.viewer;

    let body: { nickname?: unknown; followApprovalRequired?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("JSON 본문이 필요합니다.");
    }

    if (typeof body.nickname === "string") {
      const nickname = body.nickname.trim();
      if (!nickname || nickname.length > 20) return badRequest("닉네임은 1~20자로 입력해 주세요.");
      doc.nickname = nickname;
      // 통합 회원 목록에서도 같은 이름으로 보이게 맞춘다
      if (!doc.pin) doc.name = nickname;
    }

    if (typeof body.followApprovalRequired === "boolean") {
      doc.followApprovalRequired = body.followApprovalRequired;
    }

    await doc.save();

    return NextResponse.json({
      ok: true,
      me: {
        userId: doc.userId,
        nickname: doc.nickname ?? "",
        email: doc.email ?? null,
        profileImage: doc.profileImage ?? null,
        followApprovalRequired: Boolean(doc.followApprovalRequired),
        hasPinLogin: Boolean(doc.pin),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * 2hbk 만의 탈퇴는 **없앴다.** (2026-09-08)
 *
 * 탈퇴는 여섯 서비스 공통이다 — 방침에 "여섯 서비스 공통 탈퇴, 6개월 보관 후
 * 폐기" 라고 적어 공개했다. 여기서 2hbk 기록만 즉시 지우면 그 문구와 어긋난다.
 * 실제로 예전 동작은 **즉시 삭제**였고 보관 기간도 없었다.
 *
 * 지금은 이렇게 나뉜다.
 *   탈퇴 신청   포털 /account/withdraw  (메일 확인까지 받고 withdrawnAt 만 남긴다)
 *   6개월 뒤    포털 정리 작업이 이 앱의 /api/admin/purge-user 를 부른다
 *
 * → myjane/app/api/cron/purge · my-obsidian-vault / 50-Plans/C 법적 페이지.md
 */
export async function DELETE() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "탈퇴는 myjane 계정에서 진행합니다. https://www.myjane.co.kr/account/withdraw 을 이용해 주세요.",
    },
    { status: 410 },
  );
}

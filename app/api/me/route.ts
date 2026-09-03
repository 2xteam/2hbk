import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { getUserModel } from "@/models/User";
import { getGoalModel } from "@/models/Goal";
import { getFollowModel } from "@/models/Follow";
import { getGoalInvitationModel } from "@/models/GoalInvitation";

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
 * 2hbk 탈퇴.
 *
 * 통합 회원이라 계정 자체를 지우면 다른 myjane 앱의 기록까지 사라진다. 그래서
 * **2hbk 흔적만 지우고** 계정은 남긴다 — 전화번호+PIN 로그인이 없는(2hbk에서
 * 가입한) 계정만 문서째 지운다.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { doc, userId } = auth.viewer;

    await connectDB();

    // 내가 만든 목표, 참가 흔적, 팔로우, 초대를 정리한다
    await getGoalModel().deleteMany({ createdBy: userId }).exec();
    await getGoalModel()
      .updateMany({ "participants.userId": userId }, { $pull: { participants: { userId } } })
      .exec();
    await getFollowModel()
      .deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] })
      .exec();
    await getGoalInvitationModel()
      .deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
      .exec();

    const User = getUserModel();
    if (doc.pin) {
      // 다른 앱을 쓰고 있는 계정 — 2hbk 필드만 비운다
      await User.updateOne(
        { _id: doc._id },
        {
          $set: {
            userId: null,
            nickname: null,
            password: null,
            profileImage: null,
            followApprovalRequired: false,
          },
        },
      ).exec();
      return NextResponse.json({ ok: true, keptAccount: true });
    }

    await User.deleteOne({ _id: doc._id }).exec();
    return NextResponse.json({ ok: true, keptAccount: false });
  } catch (err) {
    return serverError(err);
  }
}

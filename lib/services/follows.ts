import { connectDB } from "@/lib/db";
import { getFollowModel, type FollowDocument } from "@/models/Follow";
import { getUserModel } from "@/models/User";
import { briefOf, lookupUsers, type UserBrief } from "@/lib/services/users";

export type FollowView = {
  followId: string;
  status: string;
  /** 보는 사람 기준 상대방 */
  other: UserBrief;
  /** 보는 사람이 요청을 보낸 쪽인지 */
  outgoing: boolean;
  createdAt: string | null;
  approvedAt: string | null;
};

const iso = (d: unknown): string | null => (d instanceof Date ? d.toISOString() : null);

export async function toFollowViews(
  rows: FollowDocument[],
  viewerId: string,
): Promise<FollowView[]> {
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.followerId === viewerId ? r.followingId : r.followerId);
  }
  const users = await lookupUsers(ids);

  return rows.map((r) => {
    const outgoing = r.followerId === viewerId;
    return {
      followId: String(r._id),
      status: r.status ?? "pending",
      other: briefOf(users, outgoing ? r.followingId : r.followerId),
      outgoing,
      createdAt: iso((r as { createdAt?: Date }).createdAt),
      approvedAt: iso(r.approvedAt),
    };
  });
}

/** 나와 얽힌 모든 팔로우 관계 */
export async function findMyFollows(
  viewerId: string,
  status?: string,
): Promise<FollowDocument[]> {
  await connectDB();
  const query: Record<string, unknown> = {
    $or: [{ followerId: viewerId }, { followingId: viewerId }],
  };
  if (status) query.status = status;
  return getFollowModel().find(query).sort({ createdAt: -1 }).exec();
}

/**
 * 팔로우를 건다.
 *
 * 상대가 이미 나에게 `pending` 요청을 보내 둔 상태라면 새 문서를 만들지 않고
 * 그 요청을 승인 처리한다. 서로 요청만 쌓여 아무도 이어지지 않는 상태를 막는다.
 *
 * 상대가 `followApprovalRequired`를 꺼 두었으면 바로 승인된다.
 */
export async function requestFollow(
  followerId: string,
  followingId: string,
): Promise<FollowDocument> {
  if (followerId === followingId) throw new Error("자기 자신은 팔로우할 수 없습니다.");

  await connectDB();
  const Follow = getFollowModel();

  const reverse = await Follow.findOne({
    followerId: followingId,
    followingId: followerId,
    status: "pending",
  }).exec();

  if (reverse) {
    reverse.status = "approved";
    reverse.approvedAt = new Date();
    reverse.updatedBy = followerId;
    await reverse.save();
    return reverse;
  }

  const existing = await Follow.findOne({ followerId, followingId }).exec();
  if (existing) return existing;

  const target = await getUserModel().findOne({ userId: followingId }).lean().exec();
  if (!target) throw new Error("상대를 찾을 수 없습니다.");

  const needsApproval = Boolean(target.followApprovalRequired);

  return Follow.create({
    followerId,
    followingId,
    status: needsApproval ? "pending" : "approved",
    approvedAt: needsApproval ? undefined : new Date(),
    createdBy: followerId,
    updatedBy: followerId,
  });
}

/** 받은 요청을 승인한다. 승인 권한은 요청을 받은 사람에게만 있다 */
export async function approveFollow(
  followId: string,
  viewerId: string,
): Promise<FollowDocument> {
  await connectDB();
  const follow = await getFollowModel().findById(followId).exec();
  if (!follow) throw new Error("팔로우 요청을 찾을 수 없습니다.");
  if (follow.followingId !== viewerId) throw new Error("승인할 권한이 없습니다.");
  if (follow.status === "approved") return follow;

  follow.status = "approved";
  follow.approvedAt = new Date();
  follow.updatedBy = viewerId;
  await follow.save();
  return follow;
}

/** 팔로우를 끊거나 요청을 취소한다. 양쪽 당사자 모두 할 수 있다 */
export async function removeFollow(followId: string, viewerId: string): Promise<void> {
  await connectDB();
  const Follow = getFollowModel();
  const follow = await Follow.findById(followId).exec();
  if (!follow) throw new Error("팔로우를 찾을 수 없습니다.");
  if (follow.followerId !== viewerId && follow.followingId !== viewerId) {
    throw new Error("이 관계를 지울 권한이 없습니다.");
  }
  await Follow.deleteOne({ _id: follow._id }).exec();
}

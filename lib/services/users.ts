import { connectDB } from "@/lib/db";
import { getUserModel } from "@/models/User";
import { getFollowModel } from "@/models/Follow";

/** 화면에 사람을 표시할 때 필요한 최소 정보 */
export type UserBrief = {
  userId: string;
  nickname: string;
  profileImage: string | null;
};

/** 삭제된 계정이 만든 목표가 남아 있다. 화면이 빈칸으로 무너지지 않게 대신 쓴다 */
export const UNKNOWN_USER: UserBrief = {
  userId: "",
  nickname: "알 수 없는 사용자",
  profileImage: null,
};

/**
 * 여러 `userId`를 한 번에 조회한다.
 *
 * 기존 백엔드는 참가자마다 사용자 조회를 한 번씩 돌려(N+1) 목표 12개짜리 목록에도
 * 수십 번 왕복했다. 목록을 그리기 전에 등장하는 id를 모아 한 번에 가져온다.
 */
export async function lookupUsers(userIds: Iterable<string>): Promise<Map<string, UserBrief>> {
  const ids = [...new Set([...userIds].filter(Boolean))];
  const map = new Map<string, UserBrief>();
  if (ids.length === 0) return map;

  await connectDB();
  const User = getUserModel();
  const docs = await User.find({ userId: { $in: ids } })
    .select({ userId: 1, nickname: 1, name: 1, profileImage: 1 })
    .lean()
    .exec();

  for (const d of docs) {
    if (!d.userId) continue;
    map.set(d.userId, {
      userId: d.userId,
      nickname: d.nickname ?? d.name ?? "이름없음",
      profileImage: d.profileImage ?? null,
    });
  }
  return map;
}

export function briefOf(map: Map<string, UserBrief>, userId: string | null | undefined): UserBrief {
  if (!userId) return UNKNOWN_USER;
  return map.get(userId) ?? { ...UNKNOWN_USER, userId };
}

export async function findByUserId(userId: string): Promise<UserBrief | null> {
  const map = await lookupUsers([userId]);
  return map.get(userId) ?? null;
}

/**
 * 두 사람의 팔로우 관계를 본다.
 * 양방향 모두 approved면 맞팔(`mutual`), 아니면 존재하는 쪽의 상태를 돌려준다.
 */
export async function checkFollowStatus(
  viewerId: string,
  targetId: string,
): Promise<{ followStatus: string | null; followId: string | null }> {
  await connectDB();
  const Follow = getFollowModel();

  const [forward, reverse] = await Promise.all([
    Follow.findOne({ followerId: viewerId, followingId: targetId }).lean().exec(),
    Follow.findOne({ followerId: targetId, followingId: viewerId }).lean().exec(),
  ]);

  if (forward?.status === "approved" && reverse?.status === "approved") {
    return { followStatus: "mutual", followId: String(forward._id) };
  }
  if (forward) return { followStatus: forward.status ?? null, followId: String(forward._id) };
  if (reverse) return { followStatus: reverse.status ?? null, followId: String(reverse._id) };
  return { followStatus: null, followId: null };
}

/** 어느 한쪽이라도 승인된 관계가 있으면 "이어져 있다"고 본다 */
export async function isConnected(a: string, b: string): Promise<boolean> {
  await connectDB();
  const Follow = getFollowModel();
  const hit = await Follow.findOne({
    status: "approved",
    $or: [
      { followerId: a, followingId: b },
      { followerId: b, followingId: a },
    ],
  })
    .lean()
    .exec();
  return Boolean(hit);
}

/** 나와 이어진 사람들의 userId. 방향은 가리지 않는다 */
export async function getConnectedUserIds(userId: string): Promise<string[]> {
  await connectDB();
  const Follow = getFollowModel();
  const rows = await Follow.find({
    status: "approved",
    $or: [{ followerId: userId }, { followingId: userId }],
  })
    .lean()
    .exec();

  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.followerId === userId ? r.followingId : r.followerId);
  }
  ids.delete(userId);
  return [...ids];
}

export type UserSearchResult = UserBrief & { followStatus: string | null };

/** 닉네임으로 사람 찾기. 본인은 빼고, 각자와의 팔로우 상태를 붙인다 */
export async function searchUsersByNickname(
  query: string,
  viewerId: string,
): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  await connectDB();
  const User = getUserModel();

  const docs = await User.find({
    userId: { $ne: null },
    nickname: { $regex: escapeRegex(trimmed), $options: "i" },
  })
    .select({ userId: 1, nickname: 1, profileImage: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();

  const others = docs.filter((d) => d.userId && d.userId !== viewerId);
  if (others.length === 0) return [];

  // 팔로우 관계를 한 번에 가져와 사람마다 조회하지 않는다
  const Follow = getFollowModel();
  const targetIds = others.map((d) => d.userId as string);
  const rows = await Follow.find({
    $or: [
      { followerId: viewerId, followingId: { $in: targetIds } },
      { followingId: viewerId, followerId: { $in: targetIds } },
    ],
  })
    .lean()
    .exec();

  const forward = new Map<string, string>();
  const reverse = new Map<string, string>();
  for (const r of rows) {
    if (r.followerId === viewerId) forward.set(r.followingId, r.status ?? "");
    else reverse.set(r.followerId, r.status ?? "");
  }

  return others.map((d) => {
    const id = d.userId as string;
    const f = forward.get(id);
    const b = reverse.get(id);
    const followStatus =
      f === "approved" && b === "approved" ? "mutual" : (f ?? b ?? null);
    return {
      userId: id,
      nickname: d.nickname ?? "이름없음",
      profileImage: d.profileImage ?? null,
      followStatus,
    };
  });
}

/** 정규식 검색어에 들어온 특수문자를 그대로 문자로 다룬다 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { connectDB } from "@/lib/db";
import { deleteImages } from "@/lib/r2";
import { getUserModel } from "@/models/User";
import { getFollowModel } from "@/models/Follow";
import { getGoalModel } from "@/models/Goal";
import { getGoalInvitationModel } from "@/models/GoalInvitation";

/**
 * 이 앱(2hbk)이 가진 한 사람의 데이터를 지운다.
 *
 * **회원 문서는 건드리지 않는다.** 회원은 여섯 앱이 공유하고 포털이 원본을
 * 갖는다. 여기서 지우면 다른 앱의 기록까지 함께 사라진다.
 *
 * 부르는 곳은 하나다 — 포털의 정리 작업이 `/api/admin/purge-user` 로 부른다.
 * 탈퇴한 지 6개월이 지나 폐기할 때다.
 * → myjane/app/api/cron/purge · my-obsidian-vault / 50-Plans/C 법적 페이지.md
 */
export type PurgeResult = {
  goals: number;
  participations: number;
  follows: number;
  invitations: number;
  /** R2 에서 지운 이미지 개수 (목표 이미지 · 프로필 사진) */
  r2Files: number;
};

export async function purgeUserData(userId: string): Promise<PurgeResult> {
  await connectDB();

  /*
    지우기 전에 이미지 주소를 모아 둔다 — 행을 지운 뒤에는 찾을 수 없다.
    목표 이미지와 프로필 사진 둘 다 R2 에 있다 → lib/r2.ts 의 deleteImages
  */
  const myGoals = await getGoalModel()
    .find({ createdBy: userId }, { goalImage: 1 })
    .lean()
    .exec();
  const profile = await getUserModel()
    .findOne({ userId }, { profileImage: 1 })
    .lean()
    .exec();
  const imageUrls = [
    ...myGoals.map((g) => (typeof g.goalImage === "string" ? g.goalImage : "")),
    typeof profile?.profileImage === "string" ? profile.profileImage : "",
  ].filter(Boolean);
  const r2Files = await deleteImages(imageUrls);

  /* 내가 만든 목표 */
  const goals = await getGoalModel().deleteMany({ createdBy: userId }).exec();

  /* 남의 목표에 참가한 흔적 — 목표 자체는 남긴다 */
  const participations = await getGoalModel()
    .updateMany({ "participants.userId": userId }, { $pull: { participants: { userId } } })
    .exec();

  const follows = await getFollowModel()
    .deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] })
    .exec();

  const invitations = await getGoalInvitationModel()
    .deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
    .exec();

  return {
    goals: goals.deletedCount ?? 0,
    participations: participations.modifiedCount ?? 0,
    follows: follows.deletedCount ?? 0,
    invitations: invitations.deletedCount ?? 0,
    r2Files,
  };
}

import { connectDB } from "@/lib/db";
import {
  getGoalInvitationModel,
  newInvitationId,
  type GoalInvitationDocument,
  type InvitationStatus,
} from "@/models/GoalInvitation";
import { getGoalModel } from "@/models/Goal";
import { addParticipant, canView } from "@/lib/services/goals";
import { briefOf, lookupUsers, type UserBrief } from "@/lib/services/users";

export type InvitationView = {
  invitationId: string;
  goalId: string;
  goalTitle: string | null;
  type: "invite" | "request";
  status: string;
  message: string | null;
  /** 보는 사람 기준 상대방 */
  other: UserBrief;
  /** 보는 사람이 보낸 것인지 */
  outgoing: boolean;
  createdAt: string | null;
  respondedAt: string | null;
};

const iso = (d: unknown): string | null => (d instanceof Date ? d.toISOString() : null);

export async function toInvitationViews(
  rows: GoalInvitationDocument[],
  viewerId: string,
): Promise<InvitationView[]> {
  const userIds = new Set<string>();
  const goalIds = new Set<string>();
  for (const r of rows) {
    userIds.add(r.fromUserId === viewerId ? r.toUserId : r.fromUserId);
    goalIds.add(r.goalId);
  }

  const [users, goals] = await Promise.all([
    lookupUsers(userIds),
    getGoalModel()
      .find({ goalId: { $in: [...goalIds] } })
      .select({ goalId: 1, title: 1 })
      .lean()
      .exec(),
  ]);
  const titleOf = new Map(goals.map((g) => [g.goalId, g.title]));

  return rows.map((r) => {
    const outgoing = r.fromUserId === viewerId;
    return {
      invitationId: r.invitationId ?? "",
      goalId: r.goalId,
      goalTitle: titleOf.get(r.goalId) ?? null,
      type: (r.type ?? "invite") as "invite" | "request",
      status: r.status ?? "pending",
      message: r.message ?? null,
      other: briefOf(users, outgoing ? r.toUserId : r.fromUserId),
      outgoing,
      createdAt: iso((r as { createdAt?: Date }).createdAt),
      respondedAt: iso(r.respondedAt),
    };
  });
}

/** 내가 보냈거나 받은 초대·요청 전부 */
export async function findMyInvitations(viewerId: string): Promise<GoalInvitationDocument[]> {
  await connectDB();
  return getGoalInvitationModel()
    .find({ $or: [{ fromUserId: viewerId }, { toUserId: viewerId }] })
    .sort({ createdAt: -1 })
    .exec();
}

/**
 * 목표 생성자가 누군가를 초대한다.
 */
export async function inviteToGoal(
  goalId: string,
  toUserId: string,
  message: string | null,
  actorId: string,
): Promise<GoalInvitationDocument> {
  await connectDB();
  const goal = await getGoalModel().findOne({ goalId }).exec();
  if (!goal) throw new Error("목표를 찾을 수 없습니다.");
  if (goal.createdBy !== actorId) throw new Error("목표를 만든 사람만 초대할 수 있습니다.");
  if (toUserId === actorId) throw new Error("자기 자신은 초대할 수 없습니다.");

  if ((goal.participants ?? []).some((p) => p.userId === toUserId)) {
    throw new Error("이미 이 목표에 참가하고 있는 사람입니다.");
  }

  const Invitation = getGoalInvitationModel();
  const existing = await Invitation.findOne({
    goalId,
    fromUserId: actorId,
    toUserId,
    status: { $in: ["pending", "accepted"] },
  }).exec();
  if (existing) throw new Error("이미 보낸 초대가 있습니다.");

  return Invitation.create({
    invitationId: newInvitationId(),
    goalId,
    fromUserId: actorId,
    toUserId,
    type: "invite",
    status: "pending",
    message: message ?? undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });
}

export type JoinResult =
  | { joined: true; invitation: null }
  | { joined: false; invitation: GoalInvitationDocument };

/**
 * 목표에 참가를 요청한다.
 *
 * `autoApprove`가 켜진 목표는 요청 문서를 남기지 않고 바로 참가시킨다.
 * 원래 백엔드는 이 자동 승인 설정을 무시하고 항상 요청을 만들었는데,
 * 그러면 "자동 승인"이라고 표시해 두고도 생성자가 일일이 눌러야 했다.
 */
export async function requestJoin(
  goalId: string,
  message: string | null,
  actorId: string,
): Promise<JoinResult> {
  await connectDB();
  const goal = await getGoalModel().findOne({ goalId }).exec();
  if (!goal) throw new Error("목표를 찾을 수 없습니다.");

  if ((goal.participants ?? []).some((p) => p.userId === actorId)) {
    throw new Error("이미 이 목표에 참가하고 있습니다.");
  }
  if (!(await canView(goal, actorId))) {
    throw new Error("참가할 수 없는 목표입니다.");
  }
  if (
    typeof goal.maxParticipants === "number" &&
    (goal.participants ?? []).length >= goal.maxParticipants
  ) {
    throw new Error("참가 인원이 모두 찼습니다.");
  }

  if (goal.createdBy === actorId || goal.autoApprove) {
    await addParticipant(goalId, actorId);
    return { joined: true, invitation: null };
  }

  const Invitation = getGoalInvitationModel();
  const existing = await Invitation.findOne({
    goalId,
    fromUserId: actorId,
    toUserId: goal.createdBy,
    status: { $in: ["pending", "accepted"] },
  }).exec();

  if (existing) {
    throw new Error(
      existing.status === "pending"
        ? "이미 참가를 요청했습니다. 승인을 기다리는 중입니다."
        : "이미 참가 요청이 수락되었습니다.",
    );
  }

  // 거절당한 요청이 있으면 지우고 다시 보낼 수 있게 한다.
  // 예전에는 한 번 거절당하면 영영 다시 요청할 수 없었다.
  await Invitation.deleteMany({
    goalId,
    fromUserId: actorId,
    toUserId: goal.createdBy,
    status: { $in: ["rejected", "cancelled"] },
  }).exec();

  const invitation = await Invitation.create({
    invitationId: newInvitationId(),
    goalId,
    fromUserId: actorId,
    toUserId: goal.createdBy,
    type: "request",
    status: "pending",
    message: message ?? undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });

  return { joined: false, invitation };
}

/**
 * 받은 초대·요청에 답한다. 답할 수 있는 사람은 받은 쪽뿐이다.
 * 수락하면 목표에 참가자로 들어간다 — 초대는 받은 사람이, 요청은 보낸 사람이 들어간다.
 */
export async function respondToInvitation(
  invitationId: string,
  status: Extract<InvitationStatus, "accepted" | "rejected">,
  viewerId: string,
): Promise<GoalInvitationDocument> {
  await connectDB();
  const Invitation = getGoalInvitationModel();
  const invitation = await Invitation.findOne({ invitationId }).exec();
  if (!invitation) throw new Error("초대를 찾을 수 없습니다.");
  if (invitation.toUserId !== viewerId) throw new Error("응답할 권한이 없습니다.");
  if (invitation.status !== "pending") throw new Error("이미 응답한 초대입니다.");

  invitation.status = status;
  invitation.respondedAt = new Date();
  invitation.updatedBy = viewerId;
  await invitation.save();

  if (status === "accepted") {
    // 초대(invite)는 받은 사람이, 참가 요청(request)은 보낸 사람이 참가자가 된다
    const joiner = invitation.type === "invite" ? invitation.toUserId : invitation.fromUserId;
    await addParticipant(invitation.goalId, joiner);
  }

  return invitation;
}

/** 보낸 초대·요청을 취소한다 */
export async function cancelInvitation(
  invitationId: string,
  viewerId: string,
): Promise<void> {
  await connectDB();
  const Invitation = getGoalInvitationModel();
  const invitation = await Invitation.findOne({ invitationId }).exec();
  if (!invitation) throw new Error("초대를 찾을 수 없습니다.");
  if (invitation.fromUserId !== viewerId) throw new Error("취소할 권한이 없습니다.");
  await Invitation.deleteOne({ _id: invitation._id }).exec();
}

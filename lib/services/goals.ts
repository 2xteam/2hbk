import { connectDB } from "@/lib/db";
import {
  getGoalModel,
  newGoalId,
  type GoalDocument,
  type GoalMode,
  type GoalVisibility,
} from "@/models/Goal";
import {
  briefOf,
  escapeRegex,
  getConnectedUserIds,
  isConnected,
  lookupUsers,
  type UserBrief,
} from "@/lib/services/users";

/** 화면이 쓰는 목표 모양 */
export type GoalView = {
  goalId: string;
  title: string;
  description: string | null;
  goalImage: string | null;
  /** 목표 달성에 필요한 스티커 수 */
  stickerCount: number;
  mode: GoalMode;
  visibility: GoalVisibility;
  status: string;
  autoApprove: boolean;
  creator: UserBrief;
  createdAt: string | null;
  updatedAt: string | null;
  participants: ParticipantView[];
  /** 보는 사람이 참가 중인지 */
  isParticipant: boolean;
  /** 보는 사람이 만든 목표인지 */
  isOwner: boolean;
};

export type ParticipantView = {
  user: UserBrief;
  status: string;
  currentStickerCount: number;
  joinedAt: string | null;
  stickerReceivedLogs: { date: string; count: number }[];
};

/**
 * 모드가 공개 범위와 승인 방식을 정한다.
 *
 * | 모드 | 공개 범위 | 자동 승인 | 첫 참가자 |
 * |---|---|---|---|
 * | personal (혼자 하기) | private | 예 | 만든 사람 |
 * | competition (겨루기) | public | 아니오 | 없음 |
 * | challenger_recruitment (챌린저 모집) | followers | 아니오 | 없음 |
 *
 * 입력으로 들어온 값이 있으면 그쪽이 이긴다.
 */
export function defaultsForMode(mode: GoalMode): {
  visibility: GoalVisibility;
  autoApprove: boolean;
  seedCreatorAsParticipant: boolean;
} {
  switch (mode) {
    case "personal":
      return { visibility: "private", autoApprove: true, seedCreatorAsParticipant: true };
    case "competition":
      return { visibility: "public", autoApprove: false, seedCreatorAsParticipant: false };
    case "challenger_recruitment":
      return { visibility: "followers", autoApprove: false, seedCreatorAsParticipant: false };
  }
}

const iso = (d: unknown): string | null =>
  d instanceof Date ? d.toISOString() : typeof d === "string" ? d : null;

/** 목표 문서들을 화면용으로 바꾼다. 등장하는 사람을 한 번에 조회한다 */
export async function toGoalViews(
  goals: GoalDocument[],
  viewerId: string,
): Promise<GoalView[]> {
  const ids = new Set<string>();
  for (const g of goals) {
    if (g.createdBy) ids.add(g.createdBy);
    for (const p of g.participants ?? []) ids.add(p.userId);
  }
  const users = await lookupUsers(ids);

  return goals.map((g) => ({
    goalId: g.goalId,
    title: g.title,
    description: g.description ?? null,
    goalImage: g.goalImage ?? null,
    stickerCount: g.stickerCount,
    mode: (g.mode ?? "personal") as GoalMode,
    visibility: (g.visibility ?? "followers") as GoalVisibility,
    status: g.status ?? "active",
    autoApprove: Boolean(g.autoApprove),
    creator: briefOf(users, g.createdBy),
    createdAt: iso((g as { createdAt?: Date }).createdAt),
    updatedAt: iso((g as { updatedAt?: Date }).updatedAt),
    participants: (g.participants ?? []).map((p) => ({
      user: briefOf(users, p.userId),
      status: p.status ?? "active",
      currentStickerCount: p.currentStickerCount ?? 0,
      joinedAt: iso(p.joinedAt),
      stickerReceivedLogs: (p.stickerReceivedLogs ?? []).map((l) => ({
        date: iso(l.date) ?? "",
        count: l.count,
      })),
    })),
    isParticipant: (g.participants ?? []).some((p) => p.userId === viewerId),
    isOwner: g.createdBy === viewerId,
  }));
}

export async function toGoalView(goal: GoalDocument, viewerId: string): Promise<GoalView> {
  const [view] = await toGoalViews([goal], viewerId);
  return view;
}

/** 내가 만든 목표 + 내가 참가한 목표 */
export async function findMyGoals(viewerId: string): Promise<GoalDocument[]> {
  await connectDB();
  return getGoalModel()
    .find({ $or: [{ createdBy: viewerId }, { "participants.userId": viewerId }] })
    .sort({ createdAt: -1 })
    .exec();
}

/** 내가 만든 목표만 */
export async function findGoalsCreatedBy(userId: string): Promise<GoalDocument[]> {
  await connectDB();
  return getGoalModel().find({ createdBy: userId }).sort({ createdAt: -1 }).exec();
}

/** 남이 만들었는데 내가 참가 중인 목표 */
export async function findParticipatedGoals(viewerId: string): Promise<GoalDocument[]> {
  await connectDB();
  return getGoalModel()
    .find({ "participants.userId": viewerId, createdBy: { $ne: viewerId } })
    .sort({ createdAt: -1 })
    .exec();
}

/**
 * 둘러보기 피드 — 이어진 사람들이 올린 **챌린저 모집** 목표.
 * 공개 범위가 `followers`인 목표는 실제로 이어져 있을 때만 보인다.
 */
export async function findFeedGoals(viewerId: string): Promise<GoalDocument[]> {
  await connectDB();
  const connected = await getConnectedUserIds(viewerId);
  if (connected.length === 0) return [];

  const goals = await getGoalModel()
    .find({ createdBy: { $in: connected }, mode: "challenger_recruitment" })
    .sort({ createdAt: -1 })
    .exec();

  // 이 목록은 이미 "이어진 사람"만 담고 있으므로 followers 공개도 그대로 보인다
  return goals.filter((g) => g.visibility !== "private");
}

/** 제목으로 목표 찾기. 볼 수 있는 것만 남긴다 */
export async function searchGoals(query: string, viewerId: string): Promise<GoalDocument[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  await connectDB();
  const goals = await getGoalModel()
    .find({ title: { $regex: escapeRegex(trimmed), $options: "i" } })
    .sort({ createdAt: -1 })
    .limit(100)
    .exec();

  const visible: GoalDocument[] = [];
  for (const g of goals) {
    if (await canView(g, viewerId)) visible.push(g);
  }
  return visible;
}

/** 이 사람이 이 목표를 볼 수 있는가 */
export async function canView(goal: GoalDocument, viewerId: string): Promise<boolean> {
  if (goal.createdBy === viewerId) return true;
  if ((goal.participants ?? []).some((p) => p.userId === viewerId)) return true;

  if (goal.visibility === "public") return true;
  if (goal.visibility === "private") return false;
  return isConnected(viewerId, goal.createdBy);
}

export async function findGoal(goalId: string): Promise<GoalDocument | null> {
  await connectDB();
  return getGoalModel().findOne({ goalId }).exec();
}

export type CreateGoalInput = {
  title: string;
  description?: string | null;
  goalImage?: string | null;
  stickerCount: number;
  mode: GoalMode;
  visibility?: GoalVisibility;
  autoApprove?: boolean;
};

export async function createGoal(
  input: CreateGoalInput,
  creatorId: string,
): Promise<GoalDocument> {
  await connectDB();
  const defaults = defaultsForMode(input.mode);

  return getGoalModel().create({
    goalId: newGoalId(),
    title: input.title,
    description: input.description ?? undefined,
    goalImage: input.goalImage ?? undefined,
    stickerCount: input.stickerCount,
    mode: input.mode,
    visibility: input.visibility ?? defaults.visibility,
    autoApprove: input.autoApprove ?? defaults.autoApprove,
    status: "active",
    createdBy: creatorId,
    updatedBy: creatorId,
    participants: defaults.seedCreatorAsParticipant
      ? [{ userId: creatorId, currentStickerCount: 0, status: "active", joinedAt: new Date() }]
      : [],
  });
}

export type UpdateGoalInput = Partial<CreateGoalInput>;

export async function updateGoal(
  goal: GoalDocument,
  input: UpdateGoalInput,
  editorId: string,
): Promise<GoalDocument> {
  if (input.title !== undefined) goal.title = input.title;
  if (input.description !== undefined) goal.description = input.description ?? undefined;
  if (input.goalImage !== undefined) goal.goalImage = input.goalImage ?? undefined;
  if (input.stickerCount !== undefined) goal.stickerCount = input.stickerCount;

  if (input.mode !== undefined && input.mode !== goal.mode) {
    // 모드를 바꾸면 공개 범위·승인 방식도 그 모드의 기본값을 따라간다
    const defaults = defaultsForMode(input.mode);
    goal.mode = input.mode;
    goal.visibility = defaults.visibility;
    goal.autoApprove = defaults.autoApprove;
  }
  if (input.visibility !== undefined) goal.visibility = input.visibility;
  if (input.autoApprove !== undefined) goal.autoApprove = input.autoApprove;

  goal.updatedBy = editorId;
  await goal.save();
  return goal;
}

/**
 * 스티커를 준다.
 *
 * 지급 권한은 **목표를 만든 사람**에게만 있다. 기존 백엔드는 로그인만 되어 있으면
 * 누구든 아무 목표의 아무 참가자에게 스티커를 줄 수 있었다. 스티커를 모아 목표를
 * 달성하는 앱에서 이건 곧 남의 기록을 조작할 수 있다는 뜻이라 여기서 막는다.
 * 다만 `personal` 모드는 만든 사람이 곧 참가자라 스스로에게 주는 것이 정상이다.
 */
export async function giveSticker(
  goal: GoalDocument,
  toUserId: string,
  count: number,
  actorId: string,
): Promise<GoalDocument> {
  const participant = (goal.participants ?? []).find((p) => p.userId === toUserId);
  if (!participant) throw new Error("이 목표에 참가하고 있지 않은 사람입니다.");

  participant.currentStickerCount = (participant.currentStickerCount ?? 0) + count;
  participant.stickerReceivedLogs.push({ date: new Date(), count });

  // 필요한 만큼 모으면 달성으로 넘긴다
  if (participant.currentStickerCount >= goal.stickerCount) {
    participant.status = "completed";
  }

  goal.markModified("participants");
  goal.updatedBy = actorId;
  await goal.save();
  return goal;
}

/** 참가자를 목표에서 뺀다 */
export async function removeParticipant(
  goal: GoalDocument,
  participantId: string,
  actorId: string,
): Promise<GoalDocument> {
  const index = goal.participants.findIndex((p) => p.userId === participantId);
  if (index < 0) throw new Error("이 목표에 참가하고 있지 않은 사람입니다.");
  goal.participants.splice(index, 1);
  goal.markModified("participants");
  goal.updatedBy = actorId;
  await goal.save();
  return goal;
}

export async function addParticipant(goalId: string, userId: string): Promise<void> {
  await connectDB();
  await getGoalModel().updateOne(
    { goalId, "participants.userId": { $ne: userId } },
    {
      $push: {
        participants: {
          userId,
          status: "active",
          currentStickerCount: 0,
          joinedAt: new Date(),
          stickerReceivedLogs: [],
        },
      },
    },
  );
}

import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * 목표(goal). 기존 NestJS 백엔드의 `goals` 컬렉션을 **필드·인덱스 그대로** 옮겼다.
 * 참가자와 스티커 적립 로그는 별도 컬렉션이 아니라 문서 안에 내장된다.
 */

export const GOAL_MODES = ["personal", "competition", "challenger_recruitment"] as const;
export const GOAL_VISIBILITIES = ["public", "followers", "private"] as const;
export const GOAL_STATUSES = ["active", "completed", "cancelled"] as const;
export const PARTICIPATION_STATUSES = ["active", "completed", "withdrawn"] as const;

export type GoalMode = (typeof GOAL_MODES)[number];
export type GoalVisibility = (typeof GOAL_VISIBILITIES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

/** 스티커를 준 시각과 개수. 줄 때마다 한 줄씩 쌓인다 — 추이 그래프의 원본이다. */
const StickerReceivedLogSchema = new Schema(
  {
    date: { type: Date, required: true },
    count: { type: Number, required: true },
  },
  { _id: false },
);

const GoalParticipantSchema = new Schema({
  userId: { type: String, required: true },
  status: { type: String, enum: PARTICIPATION_STATUSES, default: "active" },
  currentStickerCount: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  stickerReceivedLogs: { type: [StickerReceivedLogSchema], default: [] },
});

const GoalSchema = new Schema(
  {
    goalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    goalImage: { type: String },
    /** 목표 달성에 필요한 스티커 수 */
    stickerCount: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    mode: { type: String, enum: GOAL_MODES, required: true },
    visibility: { type: String, enum: GOAL_VISIBILITIES, default: "followers" },
    status: { type: String, enum: GOAL_STATUSES, default: "active" },
    /** 생성자의 `users.userId` */
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    maxParticipants: { type: Number },
    /** 참가 요청을 자동 승인할지 */
    autoApprove: { type: Boolean, default: false },
    participants: { type: [GoalParticipantSchema], default: [] },
  },
  { timestamps: true },
);

export type Goal = InferSchemaType<typeof GoalSchema>;
export type GoalDocument = HydratedDocument<Goal>;

export function getGoalModel(): Model<Goal> {
  return (
    (mongoose.models.Goal as Model<Goal> | undefined) ??
    mongoose.model<Goal>("Goal", GoalSchema, "goals")
  );
}

/** 기존 백엔드와 같은 형식의 도메인 ID를 만든다 */
export function newGoalId(): string {
  return `goal_${Math.random().toString(36).slice(2, 11)}`;
}

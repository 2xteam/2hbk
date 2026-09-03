import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * 목표 초대·참가 요청. 방향이 반대일 뿐 같은 문서를 쓴다.
 * - `invite`  : 목표 생성자가 상대를 초대
 * - `request` : 사용자가 목표에 참가를 요청
 */

export const INVITATION_TYPES = ["invite", "request"] as const;
export const INVITATION_STATUSES = ["pending", "accepted", "rejected", "cancelled"] as const;

export type InvitationType = (typeof INVITATION_TYPES)[number];
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

const GoalInvitationSchema = new Schema(
  {
    invitationId: { type: String, unique: true },
    goalId: { type: String, required: true },
    /** 보낸 사람의 `users.userId` */
    fromUserId: { type: String, required: true },
    /** 받는 사람의 `users.userId` */
    toUserId: { type: String, required: true },
    type: { type: String, enum: INVITATION_TYPES, required: true },
    status: { type: String, enum: INVITATION_STATUSES, default: "pending" },
    message: { type: String },
    respondedAt: { type: Date },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

export type GoalInvitation = InferSchemaType<typeof GoalInvitationSchema>;
export type GoalInvitationDocument = HydratedDocument<GoalInvitation>;

export function getGoalInvitationModel(): Model<GoalInvitation> {
  return (
    (mongoose.models.GoalInvitation as Model<GoalInvitation> | undefined) ??
    mongoose.model<GoalInvitation>("GoalInvitation", GoalInvitationSchema, "goalinvitations")
  );
}

export function newInvitationId(): string {
  return `invitation_${Math.random().toString(36).slice(2, 11)}`;
}

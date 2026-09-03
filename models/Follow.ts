import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * 팔로우. `followerId` → `followingId` 방향이며 둘 다 `users.userId` 문자열이다.
 * 상대가 `followApprovalRequired`이면 `pending`으로 시작하고 승인 시 `approved`가 된다.
 */

export const FOLLOW_STATUSES = ["pending", "approved", "blocked", "mutual"] as const;
export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

const FollowSchema = new Schema(
  {
    followerId: { type: String, required: true },
    followingId: { type: String, required: true },
    status: { type: String, enum: FOLLOW_STATUSES, default: "pending" },
    approvedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

/** 중복 팔로우 방지 */
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export type Follow = InferSchemaType<typeof FollowSchema>;
export type FollowDocument = HydratedDocument<Follow>;

export function getFollowModel(): Model<Follow> {
  return (
    (mongoose.models.Follow as Model<Follow> | undefined) ??
    mongoose.model<Follow>("Follow", FollowSchema, "follows")
  );
}

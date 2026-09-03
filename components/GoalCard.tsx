import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SafeImage } from "@/components/SafeImage";
import { StickerProgress } from "@/components/StickerBoard";
import type { GoalView } from "@/lib/services/goals";

export const MODE_LABEL: Record<string, string> = {
  personal: "혼자 하기",
  competition: "겨루기",
  challenger_recruitment: "챌린저 모집",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  public: "전체 공개",
  followers: "친구에게만",
  private: "나만 보기",
};

/**
 * 목록에 놓는 목표 한 장.
 *
 * 보는 사람이 참가 중이면 **자기 진행도**를, 아니면 참가자 수와 대표 진행도를 보여준다.
 * 어느 쪽이든 "지금 얼마나 왔는지"가 카드에서 바로 읽혀야 한다.
 */
export function GoalCard({ goal, viewerId }: { goal: GoalView; viewerId: string }) {
  const mine = goal.participants.find((p) => p.user.userId === viewerId);
  const shown = mine ?? goal.participants[0] ?? null;
  const done = shown ? shown.currentStickerCount >= goal.stickerCount : false;

  return (
    <Link
      href={`/goals/${goal.goalId}`}
      className={done ? "goal-card goal-card--done" : "goal-card"}
    >
      <SafeImage className="goal-card-thumb" src={goal.goalImage} />

      <div className="goal-card-head">
        <h3 className="goal-card-title">{goal.title}</h3>
        <span className={done ? "pill pill--gold" : "pill"}>
          {done ? "달성" : MODE_LABEL[goal.mode] ?? goal.mode}
        </span>
      </div>

      {goal.description ? <p className="goal-card-desc">{goal.description}</p> : null}

      <div style={{ marginTop: 14 }}>
        {shown ? (
          <StickerProgress total={goal.stickerCount} filled={shown.currentStickerCount} />
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>
            스티커 {goal.stickerCount}개 모으기 · 아직 참가자가 없어요
          </p>
        )}
      </div>

      <div className="goal-card-meta">
        <Avatar nickname={goal.creator.nickname} src={goal.creator.profileImage} size={22} />
        <span>{goal.creator.nickname}</span>
        {goal.participants.length > 0 ? <span>· 참가 {goal.participants.length}명</span> : null}
      </div>
    </Link>
  );
}

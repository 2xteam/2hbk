"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { InviteFriends } from "@/components/InviteFriends";
import { MODE_LABEL, VISIBILITY_LABEL } from "@/components/GoalCard";
import { SafeImage } from "@/components/SafeImage";
import { Sheet } from "@/components/Sheet";
import { StickerBoard } from "@/components/StickerBoard";
import { showToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { loadSession } from "@/lib/session";
import type { GoalView, ParticipantView } from "@/lib/services/goals";

/**
 * 목표 상세.
 *
 * 위에서부터 **목표 → 내 판 → 참가자 → 관리** 순서다.
 * 목표를 만든 사람이 이 화면에서 스티커를 붙이므로 참가자 줄마다 버튼을 둔다.
 */
export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = use(params);
  const [goal, setGoal] = useState<GoalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const viewerId = loadSession()?.userId ?? "";

  const load = useCallback(async () => {
    try {
      const res = await api<{ goal: GoalView }>(`/api/goals/${goalId}`);
      setGoal(res.goal);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const giveSticker = useCallback(
    async (toUserId: string, count: number) => {
      setBusy(true);
      try {
        const res = await api<{ goal: GoalView }>(`/api/goals/${goalId}/stickers`, {
          method: "POST",
          body: { toUserId, count },
        });
        setGoal(res.goal);
        showToast(count > 0 ? "스티커를 붙였어요" : "스티커를 뗐어요");
      } catch (err) {
        showToast(errorMessage(err), "err");
      } finally {
        setBusy(false);
      }
    },
    [goalId],
  );

  const join = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api<{ joined: boolean; goal: GoalView | null }>(
        `/api/goals/${goalId}/participants`,
        { method: "POST" },
      );
      if (res.goal) setGoal(res.goal);
      showToast(res.joined ? "참가했어요" : "참가를 요청했어요. 승인을 기다려 주세요");
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }, [goalId]);

  const removeParticipant = useCallback(
    async (userId: string, self: boolean) => {
      if (!confirm(self ? "이 목표에서 나갈까요?" : "이 참가자를 내보낼까요?")) return;
      setBusy(true);
      try {
        const res = await api<{ goal: GoalView }>(
          `/api/goals/${goalId}/participants?userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        setGoal(res.goal);
        showToast(self ? "목표에서 나왔어요" : "참가자를 내보냈어요");
      } catch (err) {
        showToast(errorMessage(err), "err");
      } finally {
        setBusy(false);
      }
    },
    [goalId],
  );

  const removeGoal = useCallback(async () => {
    if (!confirm("목표를 지우면 참가자들의 스티커 기록도 함께 사라집니다. 지울까요?")) return;
    setBusy(true);
    try {
      await api(`/api/goals/${goalId}`, { method: "DELETE" });
      window.location.href = "/goals";
    } catch (err) {
      showToast(errorMessage(err), "err");
      setBusy(false);
    }
  }, [goalId]);

  if (error) {
    return (
      <Sheet eyebrow="GOAL" headline="목표를 볼 수 없어요">
        <p className="notice notice--error">{error}</p>
        <Link className="btn btn--ghost btn--sm" href="/goals">
          목표 목록으로
        </Link>
      </Sheet>
    );
  }

  if (!goal) {
    return (
      <Sheet>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          불러오는 중…
        </p>
      </Sheet>
    );
  }

  const mine = goal.participants.find((p) => p.user.userId === viewerId);
  const done = mine ? mine.currentStickerCount >= goal.stickerCount : false;

  return (
    <>
      <Sheet tone="dark" ornament eyebrow="GOAL" headline={goal.title} lead={goal.description}>
        <div className="row row--wrap" style={{ gap: 7, marginTop: 16 }}>
          <span className="pill">{MODE_LABEL[goal.mode] ?? goal.mode}</span>
          <span className="pill">{VISIBILITY_LABEL[goal.visibility] ?? goal.visibility}</span>
          <span className="pill">스티커 {goal.stickerCount}장</span>
          {goal.autoApprove ? <span className="pill">자동 참가</span> : null}
        </div>

        <div className="row" style={{ gap: 9, marginTop: 18 }}>
          <Avatar nickname={goal.creator.nickname} src={goal.creator.profileImage} size={26} />
          <span style={{ fontSize: "0.82rem", color: "rgba(232,222,250,0.8)" }}>
            {goal.creator.nickname}님이 만들었어요
          </span>
        </div>

        <SafeImage
          src={goal.goalImage}
          style={{
            width: "100%",
            marginTop: 18,
            borderRadius: "var(--radius-sm)",
            maxHeight: 260,
            objectFit: "cover",
          }}
        />
      </Sheet>

      {mine ? (
        <Sheet
          tone={done ? "gold" : "plain"}
          eyebrow="MY BOARD"
          headline={done ? "다 채웠어요 🎉" : `${mine.currentStickerCount} / ${goal.stickerCount}`}
          lead={
            done
              ? "남은 칸이 없어요. 지나온 기록은 그대로 남습니다."
              : `${goal.stickerCount - mine.currentStickerCount}칸 남았어요.`
          }
        >
          <StickerBoard total={goal.stickerCount} filled={mine.currentStickerCount} />
        </Sheet>
      ) : null}

      <Sheet eyebrow="PARTICIPANTS" headline={`함께하는 사람 ${goal.participants.length}명`}>
        {goal.participants.length === 0 ? (
          <div className="empty">
            <p className="empty-title">아직 아무도 없어요</p>
            <p className="empty-desc">
              {goal.isOwner
                ? "친구를 초대해서 같이 채워 보세요."
                : "가장 먼저 참가해 보세요."}
            </p>
          </div>
        ) : (
          <div>
            {goal.participants.map((p) => (
              <ParticipantRow
                key={p.user.userId}
                participant={p}
                goal={goal}
                viewerId={viewerId}
                busy={busy}
                onGive={giveSticker}
                onRemove={removeParticipant}
              />
            ))}
          </div>
        )}

        {!goal.isParticipant && goal.status === "active" ? (
          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 18 }}
            onClick={join}
            disabled={busy}
          >
            {goal.autoApprove || goal.isOwner ? "참가하기" : "참가 요청하기"}
          </button>
        ) : null}
      </Sheet>

      {goal.isOwner ? (
        <>
          <InviteFriends goalId={goal.goalId} />

          <Sheet eyebrow="MANAGE" headline="목표 관리">
            <div className="row row--wrap" style={{ gap: 8 }}>
              <Link className="btn btn--ghost btn--sm" href={`/goals/${goal.goalId}/edit`}>
                수정
              </Link>
              <button className="btn btn--danger btn--sm" onClick={removeGoal} disabled={busy}>
                목표 삭제
              </button>
            </div>
          </Sheet>
        </>
      ) : null}
    </>
  );
}

function ParticipantRow({
  participant,
  goal,
  viewerId,
  busy,
  onGive,
  onRemove,
}: {
  participant: ParticipantView;
  goal: GoalView;
  viewerId: string;
  busy: boolean;
  onGive: (userId: string, count: number) => void;
  onRemove: (userId: string, self: boolean) => void;
}) {
  const p = participant;
  const self = p.user.userId === viewerId;
  const filled = p.currentStickerCount;
  const done = filled >= goal.stickerCount;

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div className="row">
        <Avatar nickname={p.user.nickname} src={p.user.profileImage} size={36} />
        <div>
          <div className="person-name">
            {p.user.userId ? (
              <Link href={`/users/${p.user.userId}`}>{p.user.nickname}</Link>
            ) : (
              p.user.nickname
            )}
            {self ? <span className="muted"> (나)</span> : null}
          </div>
          <div className="person-sub">
            {done ? "다 모았어요" : `${filled} / ${goal.stickerCount}`}
          </div>
        </div>

        <div className="row-actions">
          {/* 스티커는 목표를 만든 사람만 붙인다 */}
          {goal.isOwner && goal.status === "active" ? (
            <>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => onGive(p.user.userId, -1)}
                disabled={busy || filled === 0}
                aria-label={`${p.user.nickname} 스티커 빼기`}
              >
                −
              </button>
              <button
                className="btn btn--gold btn--sm"
                onClick={() => onGive(p.user.userId, 1)}
                disabled={busy || done}
                aria-label={`${p.user.nickname} 스티커 붙이기`}
              >
                +1
              </button>
            </>
          ) : null}
          {self || goal.isOwner ? (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => onRemove(p.user.userId, self)}
              disabled={busy}
            >
              {self ? "나가기" : "내보내기"}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <StickerBoard total={goal.stickerCount} filled={filled} small />
      </div>
    </div>
  );
}

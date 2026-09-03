"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoalCard } from "@/components/GoalCard";
import { Sheet } from "@/components/Sheet";
import { api, errorMessage } from "@/lib/api";
import { loadSession } from "@/lib/session";
import type { GoalView } from "@/lib/services/goals";
import type { InvitationView } from "@/lib/services/invitations";
import type { FollowView } from "@/lib/services/follows";

/**
 * 홈 — 오늘 볼 것만 모은다.
 *
 * 1) 지금 채우고 있는 목표 요약
 * 2) **답해야 할 것**(초대·팔로우 요청) — 있을 때만 보인다
 * 3) 최근 목표 몇 개
 */
export default function HomePage() {
  const [goals, setGoals] = useState<GoalView[] | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const me = loadSession();
  const viewerId = me?.userId ?? "";

  useEffect(() => {
    (async () => {
      try {
        const [g, inv, fol] = await Promise.all([
          api<{ goals: GoalView[] }>("/api/goals"),
          api<{ invitations: InvitationView[] }>("/api/invitations"),
          api<{ follows: FollowView[] }>("/api/follows?status=pending"),
        ]);
        setGoals(g.goals);
        setWaiting(
          inv.invitations.filter((i) => !i.outgoing && i.status === "pending").length +
            fol.follows.filter((f) => !f.outgoing).length,
        );
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, []);

  const active = (goals ?? []).filter((g) => g.status === "active");
  const mine = active
    .map((g) => ({ goal: g, part: g.participants.find((p) => p.user.userId === viewerId) }))
    .filter((x) => x.part);

  const collected = mine.reduce((n, x) => n + (x.part?.currentStickerCount ?? 0), 0);
  const doneCount = mine.filter(
    (x) => (x.part?.currentStickerCount ?? 0) >= x.goal.stickerCount,
  ).length;

  return (
    <>
      <Sheet
        tone="dark"
        ornament
        eyebrow="TODAY"
        headline={
          goals === null
            ? "불러오는 중이에요"
            : mine.length === 0
              ? "첫 목표를 정해 볼까요?"
              : `${me?.nickname ?? me?.name ?? ""}님, 지금까지 ${collected}장`
        }
        lead={
          goals === null
            ? undefined
            : mine.length === 0
              ? "목표 하나와 필요한 스티커 수만 정하면 시작할 수 있어요."
              : `참가 중인 목표 ${mine.length}개 · 다 채운 목표 ${doneCount}개`
        }
      >
        <div className="row row--wrap" style={{ gap: 10, marginTop: 20 }}>
          <Link className="btn btn--primary" href="/goals/new">
            목표 만들기
          </Link>
          <Link className="btn btn--ghost" href="/goals">
            전체 목표
          </Link>
        </div>
      </Sheet>

      {error ? <p className="notice notice--error">{error}</p> : null}

      {waiting > 0 ? (
        <Sheet tone="gold" eyebrow="WAITING" headline="답을 기다리는 것이 있어요">
          <p className="lead" style={{ marginBottom: 16 }}>
            받은 초대와 친구 요청 {waiting}건이 답을 기다리고 있어요.
          </p>
          <Link className="btn btn--gold btn--sm" href="/invites">
            확인하러 가기 →
          </Link>
        </Sheet>
      ) : null}

      <Sheet eyebrow="MY GOALS" headline="채우고 있는 목표">
        {goals === null ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            불러오는 중…
          </p>
        ) : active.length === 0 ? (
          <div className="empty">
            <p className="empty-title">아직 목표가 없어요</p>
            <p className="empty-desc">
              무엇을 몇 번 하면 좋을지 정하면, 그만큼의 빈 칸이 생겨요.
            </p>
            <Link className="btn btn--primary btn--sm" href="/goals/new">
              첫 목표 만들기
            </Link>
          </div>
        ) : (
          <div className="card-grid">
            {active.slice(0, 4).map((g) => (
              <GoalCard key={g.goalId} goal={g} viewerId={viewerId} />
            ))}
            {active.length > 4 ? (
              <Link
                href="/goals"
                className="muted"
                style={{ fontSize: "0.82rem", fontWeight: 700 }}
              >
                목표 {active.length - 4}개 더 보기 →
              </Link>
            ) : null}
          </div>
        )}
      </Sheet>
    </>
  );
}

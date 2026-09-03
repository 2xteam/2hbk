"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { GoalForm } from "@/components/GoalForm";
import { Sheet } from "@/components/Sheet";
import { api, errorMessage } from "@/lib/api";
import type { GoalView } from "@/lib/services/goals";

export default function EditGoalPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = use(params);
  const [goal, setGoal] = useState<GoalView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ goal: GoalView }>(`/api/goals/${goalId}`);
        if (!res.goal.isOwner) {
          setError("목표를 만든 사람만 고칠 수 있습니다.");
          return;
        }
        setGoal(res.goal);
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [goalId]);

  if (error) {
    return (
      <Sheet eyebrow="EDIT" headline="목표를 고칠 수 없어요">
        <p className="notice notice--error">{error}</p>
        <Link className="btn btn--ghost btn--sm" href={`/goals/${goalId}`}>
          목표로 돌아가기
        </Link>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet
        tone="dark"
        ornament
        eyebrow="EDIT GOAL"
        headline="목표 고치기"
        lead="필요한 스티커 수를 줄이면 이미 다 모은 사람은 그대로 달성으로 남습니다."
      />
      <Sheet>
        {goal ? (
          <GoalForm goal={goal} />
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            불러오는 중…
          </p>
        )}
      </Sheet>
    </>
  );
}

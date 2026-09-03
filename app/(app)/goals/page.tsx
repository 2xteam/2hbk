"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GoalCard } from "@/components/GoalCard";
import { Sheet } from "@/components/Sheet";
import { api, errorMessage } from "@/lib/api";
import { loadSession } from "@/lib/session";
import type { GoalView } from "@/lib/services/goals";

type Tab = "mine" | "participated" | "feed" | "search";

const TABS: { id: Tab; label: string }[] = [
  { id: "mine", label: "내 목표" },
  { id: "participated", label: "참가 중" },
  { id: "feed", label: "둘러보기" },
  { id: "search", label: "찾기" },
];

const EMPTY: Record<Tab, { title: string; desc: string }> = {
  mine: {
    title: "만든 목표가 없어요",
    desc: "무엇을 몇 번 하면 좋을지 정하면, 그만큼의 빈 칸이 생겨요.",
  },
  participated: {
    title: "참가 중인 목표가 없어요",
    desc: "둘러보기에서 친구가 연 목표에 참가하거나, 초대를 받아 시작할 수 있어요.",
  },
  feed: {
    title: "아직 볼 목표가 없어요",
    desc: "친구를 맺으면 그 친구가 연 챌린저 모집 목표가 여기에 보여요.",
  },
  search: { title: "찾는 목표가 없어요", desc: "목표 이름의 일부를 넣어 보세요." },
};

export default function GoalsPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [goals, setGoals] = useState<GoalView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewerId = loadSession()?.userId ?? "";

  const load = useCallback(async (scope: Tab, q: string) => {
    setGoals(null);
    setError(null);
    try {
      const params = new URLSearchParams({ scope });
      if (scope === "search") params.set("q", q);
      const res = await api<{ goals: GoalView[] }>(`/api/goals?${params}`);
      setGoals(res.goals);
    } catch (err) {
      setError(errorMessage(err));
      setGoals([]);
    }
  }, []);

  useEffect(() => {
    // 찾기 탭은 검색어를 넣기 전에는 아무것도 부르지 않는다
    if (tab === "search") {
      setGoals([]);
      return;
    }
    void load(tab, "");
  }, [tab, load]);

  return (
    <>
      <Sheet tone="dark" ornament eyebrow="GOALS" headline="스티커판">
        <div className="row row--wrap" style={{ gap: 10, marginTop: 18 }}>
          <Link className="btn btn--primary btn--sm" href="/goals/new">
            목표 만들기
          </Link>
        </div>
      </Sheet>

      <Sheet>
        <div className="tabs" style={{ display: "flex", flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "search" ? (
          <form
            style={{ display: "flex", gap: 8, marginTop: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              void load("search", query);
            }}
          >
            <input
              className="field-input"
              placeholder="목표 이름으로 찾기"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn--primary btn--sm" type="submit">
              찾기
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="notice notice--error" style={{ marginTop: 16 }}>
            {error}
          </p>
        ) : null}

        {goals === null ? (
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 18 }}>
            불러오는 중…
          </p>
        ) : goals.length === 0 ? (
          <div className="empty">
            <p className="empty-title">{EMPTY[tab].title}</p>
            <p className="empty-desc">{EMPTY[tab].desc}</p>
            {tab === "mine" ? (
              <Link className="btn btn--primary btn--sm" href="/goals/new">
                목표 만들기
              </Link>
            ) : null}
            {tab === "feed" ? (
              <Link className="btn btn--ghost btn--sm" href="/friends">
                친구 찾기
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="card-grid card-grid--2">
            {goals.map((g) => (
              <GoalCard key={g.goalId} goal={g} viewerId={viewerId} />
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

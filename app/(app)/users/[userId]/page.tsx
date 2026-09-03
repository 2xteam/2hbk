"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { loadSession } from "@/lib/session";
import type { GoalView } from "@/lib/services/goals";
import type { UserBrief } from "@/lib/services/users";

type Payload = {
  user: UserBrief;
  followStatus: string | null;
  followId: string | null;
  goals: GoalView[];
};

/** 다른 사람의 프로필 — 내가 볼 수 있는 목표까지 함께 보여준다 */
export default function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const viewerId = loadSession()?.userId ?? "";

  const load = useCallback(async () => {
    try {
      setData(await api<Payload>(`/api/users/${encodeURIComponent(userId)}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function follow() {
    setBusy(true);
    try {
      await api("/api/follows", { method: "POST", body: { userId } });
      showToast("친구 요청을 보냈어요");
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function unfollow(followId: string) {
    if (!confirm("친구 관계를 끊을까요?")) return;
    setBusy(true);
    try {
      await api(`/api/follows/${followId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Sheet eyebrow="PROFILE" headline="프로필을 볼 수 없어요">
        <p className="notice notice--error">{error}</p>
        <Link className="btn btn--ghost btn--sm" href="/friends">
          친구 목록으로
        </Link>
      </Sheet>
    );
  }

  if (!data) {
    return (
      <Sheet>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          불러오는 중…
        </p>
      </Sheet>
    );
  }

  const connected = data.followStatus === "approved" || data.followStatus === "mutual";
  const isMe = data.user.userId === viewerId;

  return (
    <>
      <Sheet tone="dark" ornament eyebrow="PROFILE" headline={data.user.nickname}>
        <div className="row" style={{ gap: 12, marginTop: 16 }}>
          <Avatar nickname={data.user.nickname} src={data.user.profileImage} size={54} />
          <div>
            <span className="pill">
              {isMe
                ? "나"
                : connected
                  ? "친구"
                  : data.followStatus === "pending"
                    ? "요청 기다리는 중"
                    : "아직 친구가 아니에요"}
            </span>
          </div>
        </div>

        {!isMe ? (
          <div className="row row--wrap" style={{ gap: 8, marginTop: 18 }}>
            {data.followStatus === null ? (
              <button className="btn btn--primary btn--sm" onClick={follow} disabled={busy}>
                친구 신청
              </button>
            ) : data.followId ? (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => unfollow(data.followId!)}
                disabled={busy}
              >
                {connected ? "친구 끊기" : "요청 취소"}
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet eyebrow="GOALS" headline={`${data.user.nickname}님의 목표`}>
        {data.goals.length === 0 ? (
          <div className="empty">
            <p className="empty-title">볼 수 있는 목표가 없어요</p>
            <p className="empty-desc">
              {connected
                ? "아직 만든 목표가 없거나 모두 비공개예요."
                : "친구가 되면 친구에게만 공개한 목표까지 볼 수 있어요."}
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {data.goals.map((g) => (
              <GoalCard key={g.goalId} goal={g} viewerId={viewerId} />
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

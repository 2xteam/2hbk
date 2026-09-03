"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import type { FollowView } from "@/lib/services/follows";

/**
 * 내 목표에 친구를 초대하는 시트 — 목표를 만든 사람에게만 보인다.
 *
 * 검색창을 두지 않고 **이어진 친구 목록**을 그대로 보여준다.
 * 초대할 상대는 대부분 이미 친구라 이름을 다시 칠 이유가 없다.
 */
export function InviteFriends({ goalId }: { goalId: string }) {
  const [friends, setFriends] = useState<FollowView[] | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ follows: FollowView[] }>("/api/follows?status=approved");
        setFriends(res.follows);
      } catch {
        setFriends([]);
      }
    })();
  }, []);

  async function invite(userId: string) {
    setBusy(userId);
    try {
      await api("/api/invitations", { method: "POST", body: { goalId, toUserId: userId } });
      setInvited((prev) => new Set(prev).add(userId));
      showToast("초대를 보냈어요");
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  if (friends === null) return null;

  return (
    <Sheet eyebrow="INVITE" headline="친구 초대하기">
      {friends.length === 0 ? (
        <div className="empty">
          <p className="empty-title">아직 이어진 친구가 없어요</p>
          <p className="empty-desc">Friends에서 닉네임으로 찾아 친구를 맺어 보세요.</p>
          <a className="btn btn--ghost btn--sm" href="/friends">
            친구 찾기
          </a>
        </div>
      ) : (
        friends.map((f) => (
          <div className="person-row" key={f.followId}>
            <Avatar nickname={f.other.nickname} src={f.other.profileImage} size={34} />
            <div>
              <div className="person-name">{f.other.nickname}</div>
            </div>
            <div className="row-actions">
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => invite(f.other.userId)}
                disabled={busy === f.other.userId || invited.has(f.other.userId)}
              >
                {invited.has(f.other.userId) ? "보냄" : "초대"}
              </button>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}

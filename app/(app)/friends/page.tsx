"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import type { FollowView } from "@/lib/services/follows";
import type { UserSearchResult } from "@/lib/services/users";

const STATUS_LABEL: Record<string, string> = {
  pending: "기다리는 중",
  approved: "친구",
  mutual: "친구",
  blocked: "차단됨",
};

/**
 * 친구.
 *
 * 위에 **답해야 할 요청**, 아래에 이어진 친구, 맨 아래에 닉네임 찾기를 둔다.
 * 할 일이 있는 것부터 보이게 하는 순서다.
 */
export default function FriendsPage() {
  const [follows, setFollows] = useState<FollowView[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ follows: FollowView[] }>("/api/follows");
      setFollows(res.follows);
    } catch (err) {
      showToast(errorMessage(err), "err");
      setFollows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setResults(null);
    try {
      const res = await api<{ users: UserSearchResult[] }>(
        `/api/users?q=${encodeURIComponent(query)}`,
      );
      setResults(res.users);
    } catch (err) {
      showToast(errorMessage(err), "err");
      setResults([]);
    }
  }

  async function follow(userId: string) {
    setBusy(userId);
    try {
      await api("/api/follows", { method: "POST", body: { userId } });
      showToast("친구 요청을 보냈어요");
      await load();
      if (results) {
        setResults(
          results.map((u) => (u.userId === userId ? { ...u, followStatus: "pending" } : u)),
        );
      }
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  async function approve(followId: string) {
    setBusy(followId);
    try {
      await api(`/api/follows/${followId}`, { method: "PATCH" });
      showToast("친구가 되었어요");
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  async function unfollow(followId: string, label: string) {
    if (!confirm(`${label}와의 친구 관계를 끊을까요?`)) return;
    setBusy(followId);
    try {
      await api(`/api/follows/${followId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  const incoming = (follows ?? []).filter((f) => !f.outgoing && f.status === "pending");
  const outgoing = (follows ?? []).filter((f) => f.outgoing && f.status === "pending");
  const friends = (follows ?? []).filter(
    (f) => f.status === "approved" || f.status === "mutual",
  );

  return (
    <>
      <Sheet
        tone="dark"
        ornament
        eyebrow="FRIENDS"
        headline="같이 채울 사람"
        lead="친구를 맺으면 서로의 챌린저 모집 목표가 보이고, 초대할 수 있어요."
      />

      {incoming.length > 0 ? (
        <Sheet tone="gold" eyebrow="REQUESTS" headline={`받은 친구 요청 ${incoming.length}건`}>
          {incoming.map((f) => (
            <div className="person-row" key={f.followId}>
              <Avatar nickname={f.other.nickname} src={f.other.profileImage} size={36} />
              <div>
                <div className="person-name">{f.other.nickname}</div>
                <div className="person-sub">친구가 되고 싶어 해요</div>
              </div>
              <div className="row-actions">
                <button
                  className="btn btn--gold btn--sm"
                  onClick={() => approve(f.followId)}
                  disabled={busy === f.followId}
                >
                  수락
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => unfollow(f.followId, f.other.nickname)}
                  disabled={busy === f.followId}
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </Sheet>
      ) : null}

      <Sheet eyebrow="MY FRIENDS" headline={`친구 ${friends.length}명`}>
        {follows === null ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            불러오는 중…
          </p>
        ) : friends.length === 0 ? (
          <div className="empty">
            <p className="empty-title">아직 친구가 없어요</p>
            <p className="empty-desc">아래에서 닉네임으로 찾아 친구를 맺어 보세요.</p>
          </div>
        ) : (
          friends.map((f) => (
            <div className="person-row" key={f.followId}>
              <Avatar nickname={f.other.nickname} src={f.other.profileImage} size={36} />
              <div>
                <div className="person-name">
                  <Link href={`/users/${f.other.userId}`}>{f.other.nickname}</Link>
                </div>
              </div>
              <div className="row-actions">
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => unfollow(f.followId, f.other.nickname)}
                  disabled={busy === f.followId}
                >
                  끊기
                </button>
              </div>
            </div>
          ))
        )}

        {outgoing.length > 0 ? (
          <p className="note-block">
            <strong>WAITING</strong>
            보낸 요청 {outgoing.length}건이 상대의 답을 기다리고 있어요 —{" "}
            {outgoing.map((f) => f.other.nickname).join(" · ")}
          </p>
        ) : null}
      </Sheet>

      <Sheet tone="tint" eyebrow="FIND" headline="닉네임으로 찾기">
        <form style={{ display: "flex", gap: 8, marginTop: 14 }} onSubmit={search}>
          <input
            className="field-input"
            placeholder="친구의 닉네임"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn--primary btn--sm" type="submit">
            찾기
          </button>
        </form>

        {results === null ? null : results.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.82rem", marginTop: 16 }}>
            찾는 사람이 없어요.
          </p>
        ) : (
          <div style={{ marginTop: 8 }}>
            {results.map((u) => (
              <div className="person-row" key={u.userId}>
                <Avatar nickname={u.nickname} src={u.profileImage} size={36} />
                <div>
                  <div className="person-name">
                    <Link href={`/users/${u.userId}`}>{u.nickname}</Link>
                  </div>
                  {u.followStatus ? (
                    <div className="person-sub">{STATUS_LABEL[u.followStatus] ?? u.followStatus}</div>
                  ) : null}
                </div>
                <div className="row-actions">
                  {u.followStatus ? null : (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => follow(u.userId)}
                      disabled={busy === u.userId}
                    >
                      친구 신청
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

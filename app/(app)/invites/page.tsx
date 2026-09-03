"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import type { InvitationView } from "@/lib/services/invitations";

const STATUS_LABEL: Record<string, string> = {
  pending: "기다리는 중",
  accepted: "수락함",
  rejected: "거절함",
  cancelled: "취소됨",
};

/**
 * 초대·참가 요청함.
 *
 * 받은 것 중 **답하지 않은 것**을 맨 위에 둔다. 나머지는 지나간 기록이라
 * 아래로 내린다.
 */
export default function InvitesPage() {
  const [items, setItems] = useState<InvitationView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ invitations: InvitationView[] }>("/api/invitations");
      setItems(res.invitations);
    } catch (err) {
      showToast(errorMessage(err), "err");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(invitationId: string, status: "accepted" | "rejected") {
    setBusy(invitationId);
    try {
      await api(`/api/invitations/${invitationId}`, { method: "PATCH", body: { status } });
      showToast(status === "accepted" ? "참가했어요" : "거절했어요");
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(invitationId: string) {
    setBusy(invitationId);
    try {
      await api(`/api/invitations/${invitationId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(null);
    }
  }

  const waiting = (items ?? []).filter((i) => !i.outgoing && i.status === "pending");
  const sent = (items ?? []).filter((i) => i.outgoing);
  const past = (items ?? []).filter((i) => !i.outgoing && i.status !== "pending");

  return (
    <>
      <Sheet
        tone="dark"
        ornament
        eyebrow="INVITES"
        headline="초대와 참가 요청"
        lead="받은 초대는 수락하면 바로 그 목표의 참가자가 됩니다."
      />

      <Sheet tone={waiting.length > 0 ? "gold" : "plain"} eyebrow="TO ANSWER" headline={`답할 것 ${waiting.length}건`}>
        {items === null ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            불러오는 중…
          </p>
        ) : waiting.length === 0 ? (
          <div className="empty">
            <p className="empty-title">답할 것이 없어요</p>
            <p className="empty-desc">받은 초대나 참가 요청이 생기면 여기에 쌓여요.</p>
          </div>
        ) : (
          waiting.map((i) => (
            <div className="person-row" key={i.invitationId}>
              <Avatar nickname={i.other.nickname} src={i.other.profileImage} size={36} />
              <div>
                <div className="person-name">
                  {i.goalTitle ? (
                    <Link href={`/goals/${i.goalId}`}>{i.goalTitle}</Link>
                  ) : (
                    "사라진 목표"
                  )}
                </div>
                <div className="person-sub">
                  {i.type === "invite"
                    ? `${i.other.nickname}님의 초대`
                    : `${i.other.nickname}님이 참가하고 싶어 해요`}
                  {i.message ? ` · “${i.message}”` : ""}
                </div>
              </div>
              <div className="row-actions">
                <button
                  className="btn btn--gold btn--sm"
                  onClick={() => respond(i.invitationId, "accepted")}
                  disabled={busy === i.invitationId}
                >
                  수락
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => respond(i.invitationId, "rejected")}
                  disabled={busy === i.invitationId}
                >
                  거절
                </button>
              </div>
            </div>
          ))
        )}
      </Sheet>

      {sent.length > 0 ? (
        <Sheet eyebrow="SENT" headline={`보낸 것 ${sent.length}건`}>
          {sent.map((i) => (
            <div className="person-row" key={i.invitationId}>
              <Avatar nickname={i.other.nickname} src={i.other.profileImage} size={34} />
              <div>
                <div className="person-name">
                  {i.goalTitle ? (
                    <Link href={`/goals/${i.goalId}`}>{i.goalTitle}</Link>
                  ) : (
                    "사라진 목표"
                  )}
                </div>
                <div className="person-sub">
                  {i.other.nickname} · {STATUS_LABEL[i.status] ?? i.status}
                </div>
              </div>
              {i.status === "pending" ? (
                <div className="row-actions">
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => cancel(i.invitationId)}
                    disabled={busy === i.invitationId}
                  >
                    취소
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </Sheet>
      ) : null}

      {past.length > 0 ? (
        <Sheet tone="tint" eyebrow="PAST" headline="지나간 것">
          {past.map((i) => (
            <div className="person-row" key={i.invitationId}>
              <Avatar nickname={i.other.nickname} src={i.other.profileImage} size={30} />
              <div>
                <div className="person-name" style={{ fontSize: "0.84rem" }}>
                  {i.goalTitle ?? "사라진 목표"}
                </div>
                <div className="person-sub">
                  {i.other.nickname} · {STATUS_LABEL[i.status] ?? i.status}
                </div>
              </div>
            </div>
          ))}
        </Sheet>
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";
import { StickerBoard } from "@/components/StickerBoard";
import { api, errorMessage } from "@/lib/api";
import { showToast } from "@/components/Toast";
import type { GoalMode, GoalVisibility } from "@/models/Goal";
import type { GoalView } from "@/lib/services/goals";

const MODES: { id: GoalMode; name: string; desc: string }[] = [
  { id: "personal", name: "혼자 하기", desc: "나만 보고 내가 채웁니다." },
  { id: "competition", name: "겨루기", desc: "누구나 찾아 참가를 요청할 수 있습니다." },
  {
    id: "challenger_recruitment",
    name: "챌린저 모집",
    desc: "친구로 이어진 사람에게만 보입니다.",
  },
];

const VISIBILITIES: { id: GoalVisibility; label: string }[] = [
  { id: "private", label: "나만 보기" },
  { id: "followers", label: "친구에게만" },
  { id: "public", label: "전체 공개" },
];

/**
 * 목표 만들기·고치기 폼.
 *
 * 필요한 스티커 수를 바꾸면 **아래 미리보기 판이 바로 그만큼 늘어난다.**
 * 20이라는 숫자보다 20칸을 보는 편이 "이게 얼마나 걸릴 일인지" 가늠하기 쉽다.
 */
export function GoalForm({ goal }: { goal?: GoalView }) {
  const editing = Boolean(goal);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [stickerCount, setStickerCount] = useState(goal?.stickerCount ?? 10);
  const [mode, setMode] = useState<GoalMode>(goal?.mode ?? "personal");
  const [visibility, setVisibility] = useState<GoalVisibility | null>(goal?.visibility ?? null);
  const [autoApprove, setAutoApprove] = useState(goal?.autoApprove ?? false);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        stickerCount,
        mode,
        ...(visibility ? { visibility } : {}),
        ...(mode === "personal" ? {} : { autoApprove }),
      };

      const res = editing
        ? await api<{ goal: GoalView }>(`/api/goals/${goal!.goalId}`, {
            method: "PATCH",
            body,
          })
        : await api<{ goal: GoalView }>("/api/goals", { method: "POST", body });

      if (image) {
        const form = new FormData();
        form.append("file", image);
        try {
          await api(`/api/goals/${res.goal.goalId}/image`, { method: "POST", form });
        } catch (err) {
          // 목표는 이미 저장됐다. 사진만 실패한 것을 분명히 알린다
          showToast(`목표는 저장했지만 사진은 올리지 못했어요 — ${errorMessage(err)}`, "warn");
        }
      }

      window.location.href = `/goals/${res.goal.goalId}`;
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="field">
        <label className="field-label" htmlFor="title">
          목표 이름
        </label>
        <input
          id="title"
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="예) 매일 책 읽기"
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="description">
          설명 <span className="muted">(선택)</span>
        </label>
        <textarea
          id="description"
          className="field-input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="stickerCount">
          필요한 스티커 수
        </label>
        <input
          id="stickerCount"
          className="field-input"
          type="number"
          min={1}
          max={500}
          value={stickerCount}
          onChange={(e) => setStickerCount(Number(e.target.value))}
          required
        />
        <div style={{ marginTop: 12 }}>
          <StickerBoard total={Number.isFinite(stickerCount) ? stickerCount : 0} filled={0} small />
        </div>
      </div>

      <div className="field">
        <span className="field-label">방식</span>
        <div style={{ display: "grid", gap: 8 }}>
          {MODES.map((m) => (
            <label
              key={m.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${mode === m.id ? "var(--accent)" : "var(--border)"}`,
                background: mode === m.id ? "var(--accent-subtle)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === m.id}
                onChange={() => {
                  setMode(m.id);
                  // 방식을 바꾸면 공개 범위는 그 방식의 기본값으로 되돌린다
                  setVisibility(null);
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong style={{ fontSize: "0.88rem" }}>{m.name}</strong>
                <span className="person-sub" style={{ display: "block" }}>
                  {m.desc}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {mode !== "personal" ? (
        <>
          <div className="field">
            <label className="field-label" htmlFor="visibility">
              공개 범위
            </label>
            <select
              id="visibility"
              className="field-input"
              value={visibility ?? ""}
              onChange={(e) =>
                setVisibility((e.target.value || null) as GoalVisibility | null)
              }
            >
              <option value="">방식의 기본값 그대로</option>
              {VISIBILITIES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="row" style={{ gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
              />
              <span style={{ fontSize: "0.85rem" }}>참가 요청을 자동으로 받아들이기</span>
            </label>
            <p className="field-hint">
              끄면 참가 요청이 <strong>Invites</strong>에 쌓이고, 내가 하나씩 승인합니다.
            </p>
          </div>
        </>
      ) : null}

      <div className="field">
        <label className="field-label" htmlFor="image">
          대표 사진 <span className="muted">(선택)</span>
        </label>
        <input
          id="image"
          className="field-input"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        />
      </div>

      <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
        {busy ? "저장하는 중…" : editing ? "저장" : "목표 만들기"}
      </button>
    </form>
  );
}

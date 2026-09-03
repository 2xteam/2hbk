"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { useTheme } from "@/components/ThemeProvider";
import { api, errorMessage } from "@/lib/api";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import { PRESET_THEMES, type ThemeId } from "@/lib/theme";

type Me = {
  userId: string;
  nickname: string;
  email: string | null;
  profileImage: string | null;
  followApprovalRequired: boolean;
  /** 다른 myjane 앱에서 먼저 가입해 전화번호+PIN 로그인도 살아 있는 계정인지 */
  hasPinLogin: boolean;
};

/** 내 프로필 · 테마 · 계정 */
export default function MyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const { themeId, custom, setTheme } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ me: Me }>("/api/me");
        setMe(res.me);
        setNickname(res.me.nickname);
      } catch (err) {
        showToast(errorMessage(err), "err");
      }
    })();
  }, []);

  /** 세션 쿠키의 표시 이름도 함께 맞춘다. 안 그러면 홈 인사말이 옛 이름으로 남는다 */
  function syncSession(next: Partial<{ nickname: string }>) {
    const user = loadSession();
    if (!user) return;
    saveSession({ ...user, ...next, name: next.nickname ?? user.name });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ me: Me }>("/api/me", {
        method: "PATCH",
        body: { nickname },
      });
      setMe(res.me);
      syncSession({ nickname: res.me.nickname });
      showToast("저장했어요");
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function toggleApproval(value: boolean) {
    setBusy(true);
    try {
      const res = await api<{ me: Me }>("/api/me", {
        method: "PATCH",
        body: { followApprovalRequired: value },
      });
      setMe(res.me);
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api<{ profileImage: string }>("/api/me/profile-image", {
        method: "POST",
        form,
      });
      setMe((prev) => (prev ? { ...prev, profileImage: res.profileImage } : prev));
      showToast("사진을 바꿨어요");
    } catch (err) {
      showToast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!me) return;
    const message = me.hasPinLogin
      ? "2hbk의 목표·스티커·친구가 모두 지워집니다.\nmyjane 계정 자체는 남아 다른 앱은 그대로 쓸 수 있어요.\n계속할까요?"
      : "계정과 목표·스티커·친구가 모두 지워집니다. 되돌릴 수 없어요.\n계속할까요?";
    if (!confirm(message)) return;

    setBusy(true);
    try {
      await api("/api/me", { method: "DELETE" });
      clearSession();
      window.location.href = "/";
    } catch (err) {
      showToast(errorMessage(err), "err");
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet tone="dark" ornament eyebrow="MY" headline="내 정보">
        {me ? (
          <div className="row" style={{ gap: 14, marginTop: 16 }}>
            <Avatar nickname={me.nickname} src={me.profileImage} size={58} />
            <div>
              <div style={{ fontWeight: 800 }}>{me.nickname}</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(232,222,250,0.7)" }}>
                {me.email ?? "이메일 없음"}
              </div>
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet eyebrow="PROFILE" headline="프로필">
        <form onSubmit={saveProfile}>
          <div className="field">
            <label className="field-label" htmlFor="nickname">
              닉네임
            </label>
            <input
              id="nickname"
              className="field-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              required
            />
            <p className="field-hint">친구가 찾을 때 보이는 이름이에요.</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="photo">
              프로필 사진
            </label>
            <input
              id="photo"
              className="field-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
            />
          </div>

          <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
            저장
          </button>
        </form>
      </Sheet>

      <Sheet tone="tint" eyebrow="PRIVACY" headline="친구 요청">
        <label className="row" style={{ gap: 9, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={me?.followApprovalRequired ?? false}
            onChange={(e) => toggleApproval(e.target.checked)}
            disabled={busy || !me}
          />
          <span style={{ fontSize: "0.86rem" }}>친구 요청을 내가 직접 수락할래요</span>
        </label>
        <p className="field-hint">
          끄면 누군가 친구 신청을 하는 즉시 친구가 되고, 켜면 <strong>Invites</strong>에서
          하나씩 수락합니다.
        </p>
      </Sheet>

      <Sheet eyebrow="THEME" headline="화면 색">
        <div className="row row--wrap" style={{ gap: 8, marginTop: 6 }}>
          {PRESET_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setTheme(t.id as ThemeId)}
              style={{
                borderColor: themeId === t.id ? "var(--accent)" : "var(--border)",
                color: themeId === t.id ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: t.preview.accent,
                  border: `1px solid ${t.preview.bg}`,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>

        {themeId === "custom" ? (
          <div className="row row--wrap" style={{ gap: 14, marginTop: 16 }}>
            <label className="row" style={{ gap: 7, fontSize: "0.82rem" }}>
              배경
              <input
                type="color"
                value={custom.bg}
                onChange={(e) => setTheme("custom", { ...custom, bg: e.target.value })}
              />
            </label>
            <label className="row" style={{ gap: 7, fontSize: "0.82rem" }}>
              강조색
              <input
                type="color"
                value={custom.accent}
                onChange={(e) => setTheme("custom", { ...custom, accent: e.target.value })}
              />
            </label>
          </div>
        ) : null}
      </Sheet>

      <Sheet eyebrow="ACCOUNT" headline="계정">
        <p className="lead" style={{ marginTop: 0 }}>
          {me?.hasPinLogin
            ? "myjane 계정 하나로 여러 앱을 쓰고 있어요. 여기서 탈퇴하면 2hbk 기록만 지워집니다."
            : "myjane 계정으로 2hbk만 쓰고 있어요."}
        </p>
        <div className="row row--wrap" style={{ gap: 8, marginTop: 16 }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              clearSession();
              window.location.href = "/";
            }}
          >
            로그아웃
          </button>
          <button className="btn btn--danger btn--sm" onClick={leave} disabled={busy || !me}>
            2hbk 탈퇴
          </button>
        </div>
      </Sheet>
    </>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { ThemeProvider } from "@/components/ThemeProvider";
import { api, errorMessage } from "@/lib/api";
import { hasUsableSession, saveSession, type SessionUser } from "@/lib/session";
import { signupUrl, usesPortal } from "@/lib/portal";

/**
 * 이메일 + 비밀번호 회원가입.
 * 로그인과 마찬가지로 운영 도메인에서는 포털이 맡는다.
 */
function RegisterForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // 판단 기준은 화면 게이트와 같아야 한다 → app/login/page.tsx
    if (hasUsableSession()) {
      window.location.replace(next);
      return;
    }
    if (usesPortal()) window.location.replace(signupUrl(next));
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("비밀번호가 서로 다릅니다.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await api<{ user: SessionUser; token: string }>("/api/auth/register", {
        method: "POST",
        body: { email, password, nickname },
      });
      saveSession(res.user, res.token);
      window.location.replace(next);
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page" style={{ paddingTop: 40, maxWidth: 460 }}>
      <Sheet
        tone="dark"
        ornament
        eyebrow="START TODAY"
        headline={
          <>
            첫 칸부터
            <br />
            같이 채워요
          </>
        }
        lead="이름과 이메일만 있으면 바로 시작할 수 있어요."
      />

      <Sheet>
        <form onSubmit={submit}>
          {msg ? <p className="notice notice--error">{msg}</p> : null}

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
            <label className="field-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              className="field-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="field-hint">8자 이상으로 정해 주세요.</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="confirm">
              비밀번호 확인
            </label>
            <input
              id="confirm"
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? "만드는 중…" : "가입하고 시작하기"}
          </button>
        </form>

        <p style={{ marginTop: 18, textAlign: "center", fontSize: "0.8rem" }}>
          <span className="muted">이미 계정이 있으신가요? </span>
          <Link href={`/login?next=${encodeURIComponent(next)}`}>로그인</Link>
        </p>
      </Sheet>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <ThemeProvider>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </ThemeProvider>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { ThemeProvider } from "@/components/ThemeProvider";
import { api, errorMessage } from "@/lib/api";
import { loadSession, saveSession, type SessionUser } from "@/lib/session";
import { usesPortal, loginUrl } from "@/lib/portal";

/**
 * 이메일 + 비밀번호 로그인.
 *
 * 운영 도메인에서는 포털(`www.myjane.co.kr`)이 로그인을 맡으므로 이 화면은
 * 로컬 개발과 미리보기 배포에서 쓴다. 포털에서 열리면 바로 포털로 넘긴다.
 */
function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loadSession()) {
      window.location.replace(next);
      return;
    }
    if (usesPortal()) window.location.replace(loginUrl(next));
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api<{ user: SessionUser; token: string }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
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
        eyebrow="WELCOME BACK"
        headline={
          <>
            다시,
            <br />
            오늘의 한 칸을
          </>
        }
        lead="모아 둔 스티커판을 이어서 채워요."
      />

      <Sheet>
        <form onSubmit={submit}>
          {msg ? <p className="notice notice--error">{msg}</p> : null}

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
            <div style={{ position: "relative" }}>
              <input
                id="password"
                className="field-input"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 56 }}
                required
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                style={revealStyle}
              >
                {reveal ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? "확인하는 중…" : "로그인"}
          </button>
        </form>

        <p style={{ marginTop: 18, textAlign: "center", fontSize: "0.8rem" }}>
          <span className="muted">아직 계정이 없으신가요? </span>
          <Link href={`/register?next=${encodeURIComponent(next)}`}>회원가입</Link>
        </p>
      </Sheet>
    </main>
  );
}

const revealStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};

export default function LoginPage() {
  return (
    <ThemeProvider>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </ThemeProvider>
  );
}

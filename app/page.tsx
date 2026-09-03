import type { CSSProperties } from "react";
import { LandingCta, LandingHeaderAuth } from "@/components/LandingAuth";
import { Sheet } from "@/components/Sheet";
import { StickerBoard } from "@/components/StickerBoard";
import { ThemeProvider } from "@/components/ThemeProvider";

/**
 * 랜딩.
 *
 * 결쩜사 패턴 그대로 **시트를 쌓는다** — 전체 폭 섹션을 쓰지 않고 둥근 카드를
 * 세로로 얹고, 마지막에 어두운 푸터로 문서를 닫는다.
 * 근거: my-obsidian-vault → 20-Design/결쩜사 페이지 패턴.md
 */
export default function LandingPage() {
  return (
    <ThemeProvider>
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <header style={headerStyle}>
          <div className="page" style={{ ...headerInner, paddingTop: 14, paddingBottom: 14 }}>
            <span className="row" style={{ gap: 9 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site-title-icon.png" alt="" width={30} height={30} />
              <span style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>2hbk</span>
            </span>
            <LandingHeaderAuth />
          </div>
        </header>

        <main className="page">
          <Sheet
            tone="dark"
            ornament
            eyebrow="2HBK · STICKER GOALS"
            headline={
              <>
                오늘 하나,
                <br />
                <span style={{ color: "#ead58c" }}>스티커 한 장.</span>
              </>
            }
            lead="목표를 정하고 해낼 때마다 스티커를 붙입니다. 칸이 채워지는 걸 보는 것만으로 다음 하나를 하게 됩니다."
          >
            <div style={{ maxWidth: 340, margin: "22px 0 24px" }}>
              <StickerBoard total={20} filled={13} />
            </div>
            <LandingCta variant="hero" />
          </Sheet>

          <Sheet tone="tint" eyebrow="HOW IT WORKS" headline="세 걸음이면 됩니다">
            <ol style={stepsStyle}>
              {STEPS.map((s, i) => (
                <li key={s.title} style={stepStyle}>
                  <span style={stepNumStyle}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p style={stepTitleStyle}>{s.title}</p>
                    <p style={stepDescStyle}>{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Sheet>

          <Sheet
            eyebrow="THREE MODES"
            headline="혼자 해도, 같이 해도"
            lead="목표를 만들 때 방식을 고르면 공개 범위와 참가 승인이 알아서 따라옵니다."
          >
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {MODES.map((m) => (
                <div key={m.name} style={modeStyle}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong style={{ fontSize: "0.92rem" }}>{m.name}</strong>
                    <span className="pill">{m.scope}</span>
                  </div>
                  <p style={stepDescStyle}>{m.desc}</p>
                </div>
              ))}
            </div>
          </Sheet>

          <Sheet
            tone="gold"
            eyebrow="TOGETHER"
            headline="스티커는 목표를 만든 사람이 붙입니다"
            lead="아이의 목표는 부모가, 함께 겨루는 목표는 그 목표를 연 사람이 붙입니다. 아무나 남의 칸을 채울 수 없습니다."
          >
            <p className="note-block">
              <strong>NOTE</strong>
              친구를 맺으면 서로의 챌린저 모집 목표가 보입니다. 초대를 받거나 참가를 요청해
              같은 목표를 함께 채울 수 있습니다.
            </p>
          </Sheet>

          <Sheet center eyebrow="START" headline="오늘 목표 하나만 정해 볼까요?">
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <LandingCta variant="closing" />
            </div>
          </Sheet>
        </main>

        <footer style={footerStyle}>
          <div className="page" style={{ textAlign: "center", paddingBottom: 28 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 800, letterSpacing: "-0.02em" }}>
              2hbk
            </p>
            <p style={footerLineStyle}>
              함히보까 — 함께 목표를 정하고 스티커를 모아 채우는 기록 도구입니다.
            </p>
            <p style={{ margin: "14px 0 0" }}>
              <a
                href="https://www.myjane.co.kr"
                className="myjane-mark"
                style={{ color: "#fff" }}
              >
                my<span>jane</span>
              </a>
            </p>
            <p style={{ ...footerLineStyle, marginTop: 8 }}>
              @2026 MyJane All rights reserved
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

const STEPS = [
  { title: "목표를 만든다", desc: "이름과 필요한 스티커 수를 정합니다. 20칸짜리 판이 생깁니다." },
  { title: "해낼 때마다 붙인다", desc: "목표를 만든 사람이 스티커를 붙입니다. 잘못 붙였다면 뺄 수도 있습니다." },
  { title: "다 채우면 달성", desc: "칸을 다 채우면 금색 판으로 바뀝니다. 지나온 기록은 그대로 남습니다." },
];

const MODES = [
  { name: "혼자 하기", scope: "나만 보기", desc: "내 목표를 내가 채웁니다. 만들면 바로 참가자가 됩니다." },
  { name: "겨루기", scope: "전체 공개", desc: "누구나 찾아 참가를 요청할 수 있습니다. 같은 목표를 여럿이 나란히 채웁니다." },
  { name: "챌린저 모집", scope: "친구에게만", desc: "친구로 이어진 사람에게만 보입니다. 초대해서 함께 시작합니다." },
];

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  background: "var(--bg-primary)",
  borderBottom: "1px solid var(--border-subtle)",
};

const headerInner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const stepsStyle: CSSProperties = {
  listStyle: "none",
  margin: "20px 0 0",
  padding: 0,
  display: "grid",
  gap: 16,
};

const stepStyle: CSSProperties = { display: "flex", gap: 14, alignItems: "flex-start" };

const stepNumStyle: CSSProperties = {
  flexShrink: 0,
  width: 30,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
  color: "var(--accent)",
  paddingTop: 2,
};

const stepTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.94rem",
  fontWeight: 800,
  letterSpacing: "-0.3px",
};

const stepDescStyle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "0.82rem",
  lineHeight: 1.75,
  color: "var(--text-secondary)",
  wordBreak: "keep-all",
};

const modeStyle: CSSProperties = {
  padding: "15px 17px",
  borderRadius: "var(--radius-sm)",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
};

const footerStyle: CSSProperties = {
  marginTop: 40,
  paddingTop: 30,
  background: "#160b26",
  color: "#fff",
};

const footerLineStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  lineHeight: 1.8,
  color: "rgba(232,222,250,0.62)",
  wordBreak: "keep-all",
};

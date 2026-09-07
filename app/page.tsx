import type { CSSProperties } from "react";
import { AppIcon } from "@/components/AppIcon";
import { LandingCta, LandingHeaderAuth } from "@/components/LandingAuth";
import { ScrollProgress } from "@/components/ScrollProgress";
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
              <AppIcon size={30} priority />
              <span style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>2hbk</span>
            </span>
            <LandingHeaderAuth />
          </div>
          {/* 헤더가 sticky 라서 띠가 스크롤을 따라온다 */}
          <ScrollProgress />
        </header>

        <main className="page">
          <Sheet
            tone="dark"
            point
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
            {/* 번호 원과 연결선은 app/elements.css 의 .flow 가 그린다.
                예전 인라인 stepNumStyle 은 번호에 면적용 var(--accent) 를 글자색으로
                썼다 — .flow-num 은 글자용 var(--accent-ink) 를 쓴다 */}
            <ol className="flow">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flow-step">
                  <span className="flow-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Sheet>

          <Sheet
            eyebrow="THREE MODES"
            headline={<>혼자 해도, <span className="mark">같이 해도</span></>}
            lead="목표를 만들 때 방식을 고르면 공개 범위와 참가 승인이 알아서 따라옵니다."
          >
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {MODES.map((m) => (
                <div key={m.name} className="card--point" style={modeStyle}>
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

          <Sheet center point eyebrow="START" headline="오늘 목표 하나만 정해 볼까요?">
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
                style={{ color: "var(--on-dark)" }}
              >
                my<span>jane</span>
              </a>
            </p>
            {/*
              법적 고지 — 세 페이지는 포털(myjane)에 한 벌만 둔다.
              여섯 앱이 회원과 세션을 공유하므로 방침도 한 곳이어야 한다.
              → my-obsidian-vault / 50-Plans/C 법적 페이지.md
            */}
            <p style={footerLegalStyle}>
              <a href="https://www.myjane.co.kr/legal/privacy" style={footerLegalLinkStyle}>
                개인정보처리방침
              </a>
              <span style={footerLegalSepStyle}>·</span>
              <a href="https://www.myjane.co.kr/legal/terms" style={footerLegalLinkStyle}>
                이용약관
              </a>
              <span style={footerLegalSepStyle}>·</span>
              <a href="https://www.myjane.co.kr/legal/cookies" style={footerLegalLinkStyle}>
                쿠키 안내
              </a>
            </p>
            <p style={{ ...footerLineStyle, marginTop: 8 }}>
              @2026 myjane All rights reserved
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

const stepDescStyle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "0.82rem",
  lineHeight: 1.75,
  color: "var(--text-secondary)",
  wordBreak: "keep-all",
};

const modeStyle: CSSProperties = {
  padding: "15px 17px",
  // ⚠️ 좌상·우하는 .card--point 가 깎는다 (app/elements.css). 인라인
  // borderRadius shorthand 를 쓰면 네 모서리를 모두 세워 그 깎임을 덮어쓴다 —
  // 그래서 남는 두 모서리만 longhand 로 적는다
  borderTopRightRadius: "var(--radius-sm)",
  borderBottomLeftRadius: "var(--radius-sm)",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
};

const footerStyle: CSSProperties = {
  marginTop: 40,
  paddingTop: 30,
  background: "var(--footer-bg)",
  color: "var(--on-dark)",
};

const footerLineStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  lineHeight: 1.8,
  color: "var(--on-dark-faint)",
  wordBreak: "keep-all",
};

/*
 * 어두운 푸터의 법적 고지 링크. 짙은 면 위이므로 --on-dark 계열을 쓴다
 * (밝은 면용 토큰을 쓰면 2~3:1 로 떨어진다).
 * 다섯 앱이 같은 모양이다 — 고칠 때 함께 고친다.
 */
const footerLegalStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "0.78rem",
  lineHeight: 1.9,
};

const footerLegalLinkStyle: CSSProperties = {
  color: "var(--on-dark-dim)",
  textDecoration: "none",
  fontWeight: 600,
};

const footerLegalSepStyle: CSSProperties = {
  margin: "0 8px",
  color: "var(--on-dark-faint)",
};

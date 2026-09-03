import type { CSSProperties } from "react";

/** 앱 하단 공통 푸터 — 서비스 한 줄 설명과 myjane 워드마크 */
export function SiteFooter() {
  return (
    <footer style={wrapStyle}>
      <p style={descStyle}>
        함히보까 — 함께 목표를 정하고 스티커를 모아 채우는 기록 도구입니다.
      </p>
      <p style={lineStyle}>
        <a
          href="https://www.myjane.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="myjane-mark"
        >
          my<span>jane</span>
        </a>
      </p>
      <p style={copyStyle}>@2026 MyJane All rights reserved</p>
    </footer>
  );
}

const wrapStyle: CSSProperties = {
  marginTop: "3rem",
  paddingTop: "1.5rem",
  paddingBottom: "0.5rem",
  borderTop: "1px solid var(--border-subtle)",
  textAlign: "left",
};

const descStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  wordBreak: "keep-all",
  lineHeight: 1.6,
};

const lineStyle: CSSProperties = { margin: "0.75rem 0 0" };

const copyStyle: CSSProperties = {
  margin: "0.4rem 0 0",
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2hbk",
  description: "함히보까 — 함께 목표를 정하고 스티커를 모아 채우는 기록 도구",
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

/**
 * 첫 페인트 전에 저장된 테마를 붙인다.
 * React가 붙기를 기다리면 라이트 화면이 한 번 번쩍인 뒤 다크로 바뀐다.
 */
const themeInitScript = `
(function(){
  try {
    var stored = JSON.parse(localStorage.getItem('2hbk_theme') || 'null');
    if (!stored || ['light','dark','custom'].indexOf(stored.id) < 0) return;
    document.documentElement.setAttribute('data-theme', stored.id);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
      테마 초기화 스크립트가 하이드레이션 전에 `data-theme`을 붙이므로 서버가 그린
      HTML과 속성이 달라진다. 그게 의도한 동작이라 이 요소에서만 경고를 끈다.
    */
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          결쩜사와 같은 서체 조합. 본문·라벨은 Pretendard, 큰 헤드라인은 Gowun Batang 700.
          시스템 폰트 스택으로 대체하면 색을 맞춰도 다른 사이트처럼 보인다.
          근거: my-obsidian-vault → 20-Design/결쩜사 디자인 시스템.md
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          `no-page-custom-font`는 Pages Router의 `_document.js`를 겨냥한 규칙이다.
          App Router에서는 루트 레이아웃의 <head>에 두는 것이 정상이라 여기서만 끈다.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta name="apple-mobile-web-app-title" content="2hbk" />
      </head>
      <body style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}

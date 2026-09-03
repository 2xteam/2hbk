import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트. 배경·테마 색은 **기본 테마(라이트)와 같아야** 한다.
 * 다르면 앱을 열 때 다른 색이 한 번 번쩍인다.
 * → my-obsidian-vault / 20-Design/앱 공통 UI와 아이콘.md
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "2hbk",
    short_name: "2hbk",
    description: "함히보까 — 함께 목표를 정하고 스티커를 모아 채우는 기록 도구",
    start_url: "/home",
    display: "standalone",
    background_color: "#fdfbff",
    theme_color: "#fdfbff",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/2hbk-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

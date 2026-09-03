export type ThemeId = "light" | "dark" | "custom";

export type ThemeCustomColor = {
  /** 커스텀 모드 강조색 (hex) */
  accent: string;
  /** 커스텀 모드 배경색 (hex) */
  bg: string;
};

export type ThemeConfig = {
  id: ThemeId;
  label: string;
  preview: { bg: string; accent: string; text: string };
};

/**
 * 결쩜사 팔레트를 따르되 **라이트가 기본**이다.
 * 가족이 함께 스티커를 붙이는 앱이라 밝은 화면이 기본값으로 맞다.
 * → my-obsidian-vault / 20-Design/앱 공통 UI와 아이콘.md
 */
export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: "light",
    label: "라이트",
    preview: { bg: "#fdfbff", accent: "#7c3aed", text: "#1a0f2e" },
  },
  {
    id: "dark",
    label: "퍼플 다크",
    preview: { bg: "#190527", accent: "#a78bfa", text: "#f6f1fb" },
  },
  {
    id: "custom",
    label: "커스텀",
    preview: { bg: "#fdfbff", accent: "#7c3aed", text: "#1a0f2e" },
  },
];

export const DEFAULT_THEME: ThemeId = "light";
export const DEFAULT_CUSTOM: ThemeCustomColor = { accent: "#7c3aed", bg: "#fdfbff" };

export const THEME_STORAGE_KEY = "2hbk_theme";

type StoredTheme = { id: ThemeId; custom?: ThemeCustomColor };

export function loadTheme(): StoredTheme {
  if (typeof window === "undefined") return { id: DEFAULT_THEME };
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { id: DEFAULT_THEME };
    const parsed = JSON.parse(raw) as Partial<StoredTheme>;
    const valid: ThemeId[] = ["light", "dark", "custom"];
    if (!valid.includes(parsed.id as ThemeId)) return { id: DEFAULT_THEME };
    return { id: parsed.id as ThemeId, custom: parsed.custom };
  } catch {
    return { id: DEFAULT_THEME };
  }
}

export function saveTheme(id: ThemeId, custom?: ThemeCustomColor) {
  if (typeof window === "undefined") return;
  const payload: StoredTheme = { id, ...(custom ? { custom } : {}) };
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(payload));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** 배경 밝기로 글자색을 정한다 */
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function buildCustomVars(custom: ThemeCustomColor): Record<string, string> {
  const bgRgb = hexToRgb(custom.bg) ?? [253, 251, 255];
  const accentRgb = hexToRgb(custom.accent) ?? [124, 58, 237];
  const isDark = luminance(...bgRgb) < 0.4;

  const [ar, ag, ab] = accentRgb;

  /** 기준색을 배경 쪽으로 ratio만큼 끌어당긴다 */
  const mix = (base: [number, number, number], ratio: number) =>
    `#${base
      .map((c, i) =>
        Math.round(c + (bgRgb[i] - c) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;

  const surface: [number, number, number] = isDark ? [255, 255, 255] : [0, 0, 0];

  return {
    "--bg-primary": custom.bg,
    "--bg-secondary": mix(surface, 0.94),
    "--bg-card": mix(surface, isDark ? 0.88 : 0.99),
    "--bg-elevated": mix(surface, isDark ? 0.82 : 1),
    "--border": isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)",
    "--border-subtle": isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    "--text-primary": isDark ? "#ffffff" : "#1a0f2e",
    "--text-secondary": isDark ? "#b6a9d0" : "#6b5f8a",
    "--text-muted": isDark ? "#8b7ead" : "#786b9c",
    "--accent": custom.accent,
    "--accent-hover": `rgb(${Math.max(ar - 24, 0)},${Math.max(ag - 24, 0)},${Math.max(ab - 24, 0)})`,
    "--accent-subtle": `rgba(${ar},${ag},${ab},0.14)`,
    "--point": isDark ? "#e8c96a" : "#c9a84c",
    "--point-subtle": "rgba(201,168,76,0.14)",
    "--gold": isDark ? "#e8c96a" : "#c9a84c",
    "--danger": isDark ? "#ff7a90" : "#e0455f",
    "--danger-subtle": "rgba(224,69,95,0.12)",
    "--success": isDark ? "#7ee0b8" : "#2f9e74",
    "--success-subtle": "rgba(47,158,116,0.12)",
    "--warning": "#c9a84c",
    "--input-bg": mix(surface, isDark ? 0.9 : 1),
    "--input-border": isDark ? "rgba(255,255,255,0.16)" : "rgba(72,42,97,0.14)",
    "--on-accent": "#ffffff",
  };
}

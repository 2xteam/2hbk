"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  buildCustomVars,
  DEFAULT_CUSTOM,
  DEFAULT_THEME,
  loadTheme,
  saveTheme,
  type ThemeCustomColor,
  type ThemeId,
} from "@/lib/theme";

type ThemeContextValue = {
  themeId: ThemeId;
  custom: ThemeCustomColor;
  setTheme: (id: ThemeId, custom?: ThemeCustomColor) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME,
  custom: DEFAULT_CUSTOM,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const CUSTOM_VAR_KEYS = Object.keys(buildCustomVars(DEFAULT_CUSTOM));

function applyTheme(id: ThemeId, custom: ThemeCustomColor) {
  const root = document.documentElement;
  root.setAttribute("data-theme", id);

  if (id === "custom") {
    const vars = buildCustomVars(custom);
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    // 프리셋으로 돌아올 때 인라인 변수를 걷어내야 스타일시트 값이 다시 보인다
    CUSTOM_VAR_KEYS.forEach((k) => root.style.removeProperty(k));
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
  const [custom, setCustom] = useState<ThemeCustomColor>(DEFAULT_CUSTOM);

  const customRef = useRef(custom);
  useEffect(() => {
    customRef.current = custom;
  }, [custom]);

  useEffect(() => {
    const stored = loadTheme();
    const c = stored.custom ?? DEFAULT_CUSTOM;
    setThemeId(stored.id);
    setCustom(c);
    customRef.current = c;
    applyTheme(stored.id, c);
  }, []);

  // 의존성 없는 안정 함수 — 항상 최신 customRef를 본다
  const setTheme = useRef((id: ThemeId, newCustom?: ThemeCustomColor) => {
    const c = newCustom ?? customRef.current;
    setThemeId(id);
    if (newCustom) {
      setCustom(newCustom);
      customRef.current = newCustom;
    }
    saveTheme(id, id === "custom" ? c : undefined);
    applyTheme(id, c);
  }).current;

  return (
    <ThemeContext.Provider value={{ themeId, custom, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

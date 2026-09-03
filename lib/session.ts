/**
 * myjane 통합 세션 — `snap_user` 쿠키.
 *
 * 쿠키 도메인이 `.myjane.co.kr`이라 SnapWord · SnapNote · FitLog · 2hbk가 같은 세션을 본다.
 * 그래서 이 파일의 **저장 형식은 네 앱이 공유하는 계약**이다. 필드를 빼거나 이름을 바꾸면
 * 다른 앱의 로그인이 조용히 끊긴다. 추가는 안전하다(모르는 필드는 무시된다).
 *
 * → my-obsidian-vault / 30-Patterns/인증과 세션 공유.md
 */

export type SessionUser = {
  id: string;
  name: string;
  /** 전화번호+PIN 계열 앱이 쓰는 값. 2hbk 전용 계정은 빈 문자열이다 */
  phone: string;
  /** 아래 셋은 2hbk가 덧붙인 선택 필드 — 다른 앱은 읽지 않는다 */
  email?: string;
  nickname?: string;
  userId?: string;
};

export const SESSION_KEY = "snap_user";

const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

type StoredPayload = {
  v: 1;
  user: SessionUser;
  /** 서버가 검증하는 HMAC 서명 토큰 → lib/sessionToken.ts */
  token?: string;
  expiresAt: number;
};

const ENV_COOKIE_DOMAIN: string | undefined =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_COOKIE_DOMAIN
    ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN
    : undefined;

/**
 * 현재 호스트가 쿠키 도메인에 속할 때만 `domain` 속성을 붙인다.
 * localhost나 `*.vercel.app`에서는 host-only 쿠키가 되어 로그인은 되고 공유만 안 된다.
 */
function getEffectiveDomain(): string | undefined {
  if (!ENV_COOKIE_DOMAIN) return undefined;
  if (typeof location === "undefined") return undefined;
  const host = location.hostname;
  const domain = ENV_COOKIE_DOMAIN.startsWith(".")
    ? ENV_COOKIE_DOMAIN.slice(1)
    : ENV_COOKIE_DOMAIN;
  if (host === domain || host.endsWith("." + domain)) return ENV_COOKIE_DOMAIN;
  return undefined;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = name + "=";
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.substring(prefix.length));
    }
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  const cookieDomain = getEffectiveDomain();
  let cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
  if (cookieDomain) cookie += `; domain=${cookieDomain}`;
  if (isSecure) cookie += "; Secure";
  document.cookie = cookie;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const cookieDomain = getEffectiveDomain();
  if (cookieDomain) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; domain=${cookieDomain}`;
  }
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function isSessionUser(x: unknown): x is SessionUser {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.phone === "string";
}

function readPayload(raw: string): StoredPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (o.v === 1 && isSessionUser(o.user) && typeof o.expiresAt === "number") {
      return {
        v: 1,
        user: o.user,
        token: typeof o.token === "string" ? o.token : undefined,
        expiresAt: o.expiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = getCookie(SESSION_KEY);
  if (!raw) return null;

  const payload = readPayload(raw);
  if (!payload || Date.now() > payload.expiresAt) {
    deleteCookie(SESSION_KEY);
    return null;
  }
  return payload.user;
}

/** API 호출에 실어 보낼 서명 토큰. 없으면 이 세션은 2hbk에서 쓸 수 없다 */
export function loadSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = getCookie(SESSION_KEY);
  if (!raw) return null;
  const payload = readPayload(raw);
  if (!payload || Date.now() > payload.expiresAt) return null;
  return payload.token ?? null;
}

export function saveSession(user: SessionUser, token?: string) {
  if (typeof window === "undefined") return;
  const body: StoredPayload = {
    v: 1,
    user,
    ...(token ? { token } : {}),
    expiresAt: Date.now() + SESSION_TTL_SEC * 1000,
  };
  setCookie(SESSION_KEY, JSON.stringify(body), SESSION_TTL_SEC);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  deleteCookie(SESSION_KEY);
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

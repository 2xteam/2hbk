import { loadSessionToken } from "@/lib/session";

/**
 * API 호출 한 겹.
 *
 * 서버는 쿠키 안의 서명 토큰으로 요청자를 확인한다. 같은 도메인이면 쿠키가
 * 알아서 실려 가지만, `Authorization` 헤더로도 함께 보내 두면
 * 쿠키가 막힌 환경에서도 동작한다.
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** multipart 업로드 — 이때는 Content-Type을 브라우저가 정한다 */
  form?: FormData;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body, form } = options;

  const headers: Record<string, string> = {};
  const token = loadSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* 본문이 없을 수 있다 */
  }

  const payload = (data ?? {}) as { ok?: boolean; error?: string };
  if (!res.ok || payload.ok === false) {
    throw new ApiError(payload.error ?? "요청을 처리하지 못했습니다.", res.status);
  }
  return payload as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}

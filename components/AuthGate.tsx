"use client";

import { usePathname } from "next/navigation";
import { useRequireSession } from "@/lib/useSession";

/**
 * 로그인이 필요한 화면을 감싼다.
 *
 * 상태가 정해지기 전에는 **아무것도 그리지 않는다.** 잠깐 빈 화면이 보이는 편이
 * 남의 화면 껍데기가 스쳐 보이는 것보다 낫다.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useRequireSession(pathname || "/home");

  if (session.status !== "signed-in") return null;
  return <>{children}</>;
}

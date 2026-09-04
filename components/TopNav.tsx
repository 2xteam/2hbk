"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/session";
import type { InvitationView } from "@/lib/services/invitations";
import type { FollowView } from "@/lib/services/follows";

/** 주 기능 — 데스크톱 상단에 그대로 노출. 표기는 다른 myjane 앱과 같이 영어 */
const nav = [
  { href: "/home", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/friends", label: "Friends" },
];

/** 부가 기능 — 데스크톱은 More 안에, 모바일은 구분선 아래 */
const subNav = [
  { href: "/invites", label: "Invites" },
  { href: "/my", label: "My" },
];

const otherApps = [
  { name: "SnapWord", iconUrl: "/snapword-link-icon.png", href: "https://snapword.myjane.co.kr/home" },
  { name: "SnapNote", iconUrl: "/snapnote-link-icon.png", href: "https://snapnote.myjane.co.kr/home" },
  { name: "FitLog", iconUrl: "/fitlog-link-icon.png", href: "https://fitlog.myjane.co.kr/home" },
  { name: "TypeLog", iconUrl: "/typelog-link-icon.png", href: "https://typelog.myjane.co.kr/home" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [appMenu, setAppMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [pending, setPending] = useState(0);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const logout = () => {
    clearSession();
    router.replace("/");
  };

  // 답해야 할 초대·팔로우 요청이 있으면 메뉴에 점을 찍는다.
  // 알림함이 따로 없는 앱이라 이 점이 유일한 신호다.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [inv, fol] = await Promise.all([
          api<{ invitations: InvitationView[] }>("/api/invitations"),
          api<{ follows: FollowView[] }>("/api/follows?status=pending"),
        ]);
        if (!alive) return;
        const waiting =
          inv.invitations.filter((i) => !i.outgoing && i.status === "pending").length +
          fol.follows.filter((f) => !f.outgoing).length;
        setPending(waiting);
      } catch {
        /* 로그인 전이거나 네트워크 문제 — 점을 안 찍으면 그만이다 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!appMenu) return;
    const onClick = (e: MouseEvent) => {
      if (appMenuRef.current && !appMenuRef.current.contains(e.target as Node)) setAppMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [appMenu]);

  useEffect(() => {
    if (!moreMenu) return;
    const onClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreMenu]);

  // 경로가 바뀌면 열린 메뉴를 닫는다
  useEffect(() => {
    setMoreMenu(false);
    setAppMenu(false);
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {open && <div className="topnav-backdrop" onClick={() => setOpen(false)} />}

      <nav className={`topnav ${open ? "topnav--open" : ""}`}>
        <div className="topnav-bar">
          <div className="topnav-logo-wrap" ref={appMenuRef}>
            <button type="button" className="topnav-logo" onClick={() => setAppMenu((v) => !v)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site-title-icon.png" alt="" width={28} height={28} className="topnav-logo-icon" />
              <span style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>2hbk</span>
              <ChevronIcon open={appMenu} />
            </button>
            {appMenu && (
              <div className="app-switcher">
                {otherApps.map((app) => (
                  <a key={app.name} href={app.href} className="app-switcher-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      width={28}
                      height={28}
                      className="app-switcher-icon"
                    />
                    <span style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>{app.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="topnav-links">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="topnav-link"
                data-active={pathname === href || pathname.startsWith(`${href}/`)}
              >
                {label}
              </Link>
            ))}
            <div className="topnav-more-wrap" ref={moreMenuRef}>
              <button
                type="button"
                className="topnav-link topnav-more"
                onClick={() => setMoreMenu((v) => !v)}
                aria-expanded={moreMenu}
                data-active={subNav.some(
                  (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
                )}
              >
                More
                {pending > 0 ? <span className="dot" /> : null}
                <ChevronIcon open={moreMenu} />
              </button>
              {moreMenu && (
                <div className="topnav-more-menu">
                  {subNav.map(({ href, label }) => (
                    <Link key={href} href={href} className="topnav-more-item">
                      {label}
                      {href === "/invites" && pending > 0 ? <span className="dot" /> : null}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={logout}
                    className="topnav-more-item topnav-more-item--danger"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className={`topnav-hamburger ${open ? "topnav-hamburger--open" : ""}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          >
            <span className="topnav-hamburger-line topnav-hamburger-line--1" />
            <span className="topnav-hamburger-line topnav-hamburger-line--2" />
            <span className="topnav-hamburger-line topnav-hamburger-line--3" />
          </button>
        </div>

        <div className="topnav-menu">
          {[...nav, ...subNav].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="topnav-menu-link"
              data-active={pathname === href || pathname.startsWith(`${href}/`)}
              data-sub={subNav.some((m) => m.href === href)}
            >
              {label}
              {href === "/invites" && pending > 0 ? <span className="dot" /> : null}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="topnav-menu-link topnav-menu-logout"
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transition: "transform 0.2s",
        transform: open ? "rotate(180deg)" : "none",
        flexShrink: 0,
        position: "relative",
        top: 2,
      }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { AuthGate } from "@/components/AuthGate";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastContainer } from "@/components/Toast";
import { TopNav } from "@/components/TopNav";

/** 로그인한 사람이 쓰는 화면들의 껍데기 */
export default function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <TopNav />
        <div
          className="page"
          style={{ paddingTop: "calc(var(--nav-height) + var(--nav-top) + 1.2rem)" }}
        >
          <AuthGate>{children}</AuthGate>
          <SiteFooter />
        </div>
        <ToastContainer />
      </div>
    </ThemeProvider>
  );
}

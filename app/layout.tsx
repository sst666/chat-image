import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import ThemeToggle from "@/app/components/theme-toggle";
import AppProviders from "@/app/providers";

export const metadata: Metadata = {
  title: "加菲猫chat image",
  description: "加菲猫chat image",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('tb-ai-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();",
          }}
        />
      </head>
      <body>
        <header className="app-header">
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="app-brand-mark">GF</div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-wide">加菲猫chat image</div>
                  <div className="app-muted truncate text-xs">更快搭出主图、模特图、活动图和自定义生图流程</div>
                </div>
              </div>
              <div className="md:hidden">
                <ThemeToggle />
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <nav className="app-nav">
                <Link href="/" className="app-nav-link">聊天</Link>
                <Link href="/custom-image" className="app-nav-link">自定义生图</Link>
                <Link href="/history" className="app-nav-link">历史记录</Link>
                <Link href="/settings" className="app-nav-link">设置</Link>
              </nav>
              <ThemeToggle />
            </div>

            <nav className="app-nav md:hidden">
              <Link href="/" className="app-nav-link">聊天</Link>
              <Link href="/custom-image" className="app-nav-link">自定义生图</Link>
              <Link href="/history" className="app-nav-link">历史记录</Link>
              <Link href="/settings" className="app-nav-link">设置</Link>
            </nav>
          </div>
        </header>
        <AppProviders>
          <main className="mx-auto w-full max-w-[1480px] px-3 py-3 sm:px-4 sm:py-5">
            <div className="app-shell">{children}</div>
          </main>
        </AppProviders>
      </body>
    </html>
  );
}

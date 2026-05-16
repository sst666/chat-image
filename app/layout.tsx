import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import ThemeToggle from "@/app/components/theme-toggle";

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
          <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="app-brand-mark">GF</div>
              <div>
                <div className="text-base font-semibold tracking-wide">加菲猫chat image</div>
                <div className="app-muted text-xs">更快搭出主图、模特图、活动图和自定义生图流程</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <nav className="app-nav">
                <Link href="/" className="app-nav-link">聊天</Link>
                <Link href="/custom-image" className="app-nav-link">自定义生图</Link>
                <Link href="/history" className="app-nav-link">历史记录</Link>
                <Link href="/settings" className="app-nav-link">设置</Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-5">
          <div className="app-shell">{children}</div>
        </main>
      </body>
    </html>
  );
}

import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "淘宝商品图 AI 生成平台",
  description: "Web 电商图片 AI 生成平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3">
            <div className="text-lg font-semibold tracking-wide text-slate-100">淘宝商品图 AI 生成平台</div>
            <nav className="flex gap-4 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">生图任务</Link>
              <Link href="/templates" className="hover:text-white">模板管理</Link>
              <Link href="/history" className="hover:text-white">历史记录</Link>
              <Link href="/settings" className="hover:text-white">设置</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] p-4">{children}</main>
      </body>
    </html>
  );
}

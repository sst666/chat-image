"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { ChatProvider } from "./context/ChatContext";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import SettingsPanel from "./components/SettingsPanel";

export default function CherryChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="flex h-full w-full overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--text)] shadow-[var(--shadow)]">
        {sidebarOpen ? (
          <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
        ) : null}

        <div
          className={`
            fixed inset-y-0 left-0 z-40
            transform transition-transform duration-200 ease-out
            md:relative md:transform-none md:z-auto
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
          `}
        >
          <Sidebar />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b border-[color:var(--line)] bg-[color:var(--panel-strong)] px-4 py-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold">加菲猫chat image</span>
            <button
              onClick={() => {
                setSidebarOpen(false);
                window.dispatchEvent(new CustomEvent("cherrychat:open-settings"));
              }}
              className="ml-auto rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            >
              <Settings size={18} />
            </button>
          </div>
          <ChatArea />
        </div>
        <SettingsPanel />
      </div>
    </ChatProvider>
  );
}

"use client";

import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { ChatProvider } from "./context/ChatContext";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import SettingsPanel from "./components/SettingsPanel";
import { useChatContext } from "./context/ChatContext";

export default function CherryChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <CherryChatLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    </ChatProvider>
  );
}

function CherryChatLayout({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}) {
  const { dispatch } = useChatContext();

  return (
    <div className="flex h-full w-full overflow-hidden rounded-none border border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--text)] shadow-[var(--shadow)] sm:rounded-[24px]">
      {sidebarOpen ? (
        <div className="fixed inset-0 z-30 bg-black/35 md:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-[84vw] max-w-[320px]
          transform transition-transform duration-200 ease-out
          md:relative md:z-auto md:w-auto md:transform-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
        `}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2.5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            aria-label="打开侧栏"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">加菲猫chat image</span>
          <button
            onClick={() => dispatch({ type: "NEW_CONVERSATION" })}
            className="rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            aria-label="新建对话"
            title="新建对话"
          >
            <Plus size={17} />
          </button>
          <button
            onClick={() => {
              setSidebarOpen(false);
              window.dispatchEvent(new CustomEvent("cherrychat:open-settings"));
            }}
            className="rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            aria-label="打开设置"
            title="设置"
          >
            <Settings size={17} />
          </button>
        </div>
        <ChatArea />
      </div>
      <SettingsPanel />
    </div>
  );
}

"use client";

import { MessageSquare, Settings, Sparkles } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import MessageList from "./MessageList";
import InputArea from "./InputArea";

export default function ChatArea() {
  const { state, dispatch, currentConversation } = useChatContext();

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-transparent">
      <div className="hidden shrink-0 items-center justify-between border-b border-[color:var(--line)] px-5 py-3 md:flex">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare size={16} className="app-muted shrink-0" />
          <h1 className="truncate text-sm font-medium">
            {state.conversations.find((c) => c.id === state.currentConvId)?.title ?? "新对话"}
          </h1>
        </div>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          className="rounded-lg p-1.5 app-muted transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>

      {(state.favoriteModels.length > 0 || state.recentModels.length > 0) && (
        <div
          className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-2"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {state.favoriteModels.length > 0 && (
            <>
              <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-amber-500">⭐ 常用</span>
              {state.favoriteModels.map((m) => (
                <button
                  key={`fav-${m}`}
                  onClick={() => dispatch({ type: "SET_MODEL", payload: m })}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-all ${
                    state.config.model === m
                      ? "text-white shadow-sm"
                      : "border border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400"
                  }`}
                  style={
                    state.config.model === m
                      ? { background: "linear-gradient(135deg, #d97706, #f59e0b)" }
                      : {}
                  }
                >
                  {m}
                </button>
              ))}
            </>
          )}

          {state.favoriteModels.length > 0 && state.recentModels.length > 0 && (
            <div className="mx-1 h-4 w-px shrink-0 bg-[color:var(--line)]" />
          )}

          {state.recentModels.length > 0 && (
            <>
              <span className="app-muted shrink-0 text-[10px] font-medium">最近</span>
              {state.recentModels.slice(0, 8).map((m) => (
                <button
                  key={`recent-${m}`}
                  onClick={() => {
                    dispatch({ type: "SET_MODEL", payload: m });
                    if (!state.favoriteModels.includes(m)) dispatch({ type: "ADD_RECENT_MODEL", payload: m });
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-all ${
                    state.config.model === m
                      ? "text-white shadow-sm"
                      : "border border-[color:var(--line)] bg-[color:var(--panel-strong)] app-muted hover:border-[color:var(--accent)]"
                  }`}
                  style={
                    state.config.model === m
                      ? { background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #60a5fa))" }
                      : {}
                  }
                >
                  {m}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {!currentConversation || currentConversation.messages.length === 0 ? <EmptyState /> : <MessageList />}
      </div>

      <InputArea />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 40%, #60a5fa))" }}
      >
        <Sparkles size={24} className="text-white" />
      </div>
      <div>
        <h2 className="mb-1 text-lg font-semibold">今天想聊点什么？</h2>
        <p className="app-muted max-w-xs text-sm">
          开始一段新对话，上传图片或 PDF，和 AI 一起整理想法、资料和任务。
        </p>
      </div>
      <div className="mt-2 grid w-full max-w-sm grid-cols-2 gap-2">
        {["解释一个概念", "帮我写代码", "总结一份文档", "一起头脑风暴"].map((s) => (
          <div
            key={s}
            className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-3 py-2 text-center text-xs app-muted"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

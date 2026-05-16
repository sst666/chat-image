"use client";

import React, { useMemo, useState } from "react";
import { MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import type { Conversation } from "../types";

export default function Sidebar() {
  const { state, dispatch } = useChatContext();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = state.searchQuery.toLowerCase();
    if (!q) return state.conversations;
    return state.conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [state.conversations, state.searchQuery]);

  function handleNew() {
    dispatch({ type: "NEW_CONVERSATION" });
  }

  function handleSelect(id: string) {
    dispatch({ type: "SELECT_CONVERSATION", payload: id });
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    dispatch({ type: "DELETE_CONVERSATION", payload: id });
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString("zh-CN", { weekday: "short" });
    }
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }

  return (
    <aside
      style={{ width: 280, minWidth: 280 }}
      className="flex h-full flex-col border-r border-[color:var(--line)] bg-[color:var(--panel-muted)]"
    >
      <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, #60a5fa))" }}
          >
            <MessageSquare size={15} />
          </div>
          <div>
            <div className="text-sm font-semibold">加菲猫chat image</div>
            <div className="app-muted text-[10px]">多模态聊天工作台</div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 pt-3">
        <button onClick={handleNew} className="app-button-primary flex w-full items-center justify-center gap-2 px-3 py-3 text-sm">
          <Plus size={16} />
          新建对话
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="app-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索对话..."
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
            className="app-input pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="app-muted px-3 py-5 text-center text-xs">暂无对话</div>
        ) : (
          filtered.map((conv: Conversation) => {
            const active = state.currentConvId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group relative mb-1 flex cursor-pointer items-start gap-2 rounded-2xl px-3 py-3 transition-all ${
                  active
                    ? "border border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)] shadow-sm"
                    : "border border-transparent text-[color:var(--text-soft)] hover:border-[color:var(--line)] hover:bg-[color:var(--panel-strong)]"
                }`}
              >
                <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-tight">{conv.title}</p>
                  <p className="app-muted mt-1 text-[10px]">{formatDate(conv.updatedAt)}</p>
                </div>
                {hoveredId === conv.id ? (
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="app-muted rounded-lg p-1 transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title="删除对话"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock, RefreshCw, Search, Star } from "lucide-react";
import { useChatContext } from "../context/ChatContext";

export default function ModelSelector() {
  const { state, dispatch, currentConversation, fetchModels } = useChatContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentModel = currentConversation?.model ?? state.config.model;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(model: string) {
    dispatch({ type: "SET_MODEL", payload: model });
    dispatch({ type: "ADD_RECENT_MODEL", payload: model });
    setOpen(false);
    setSearch("");
  }

  function toggleFavorite(e: React.MouseEvent, model: string) {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_FAVORITE_MODEL", payload: model });
  }

  const q = search.toLowerCase();
  const favoriteFiltered = state.favoriteModels.filter((m) => m.toLowerCase().includes(q));
  const recentFiltered = state.recentModels
    .filter((m) => !state.favoriteModels.includes(m))
    .filter((m) => m.toLowerCase().includes(q));
  const allFiltered = state.models
    .filter((m) => !state.favoriteModels.includes(m))
    .filter((m) => !state.recentModels.includes(m))
    .filter((m) => m.toLowerCase().includes(q));

  function shortName(model: string): string {
    return model.length > 22 ? `${model.slice(0, 20)}…` : model;
  }

  async function handleFetchModels() {
    if (fetching) return;
    setFetching(true);
    try {
      await fetchModels();
    } finally {
      setFetching(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-xs font-medium text-[color:var(--text-soft)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
      >
        <span>{shortName(currentModel)}</span>
        <ChevronDown size={12} className={open ? "rotate-180" : ""} style={{ transition: "transform 0.15s" }} />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-40 mb-1 max-h-[60vh] w-full overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-strong)] shadow-[var(--shadow)] sm:left-auto sm:w-72">
          <div className="border-b border-[color:var(--line)] p-2">
            <div className="relative">
              <Search size={12} className="app-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索模型..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="app-input pl-7 text-sm"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {favoriteFiltered.length > 0 ? (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                  <Star size={10} />
                  常用模型
                </div>
                {favoriteFiltered.map((m) => (
                  <ModelOption
                    key={`fav-${m}`}
                    model={m}
                    active={m === currentModel}
                    onSelect={select}
                    starred
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
                <div className="my-1 border-t border-[color:var(--line)]" />
              </div>
            ) : null}

            {state.recentModels.length > 0 ? (
              <div>
                <div className="app-muted flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide">
                  <Clock size={10} />
                  最近使用
                </div>
                {recentFiltered.slice(0, 8).map((m) => (
                  <ModelOption key={`recent-${m}`} model={m} active={m === currentModel} onSelect={select} onToggleFavorite={toggleFavorite} />
                ))}
                <div className="my-1 border-t border-[color:var(--line)]" />
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <div className="app-muted text-[10px] font-semibold uppercase tracking-wide">所有模型</div>
                <button
                  type="button"
                  onClick={() => void handleFetchModels()}
                  disabled={fetching}
                  className="app-muted flex items-center gap-1 rounded-full px-2 py-1 text-[10px] transition-colors hover:bg-[color:var(--panel-muted)] hover:text-[color:var(--accent)] disabled:opacity-50"
                >
                  <RefreshCw size={10} className={fetching ? "animate-spin" : ""} />
                  获取模型
                </button>
              </div>
              {allFiltered.map((m) => (
                <ModelOption key={m} model={m} active={m === currentModel} onSelect={select} onToggleFavorite={toggleFavorite} />
              ))}
            </div>

            {favoriteFiltered.length === 0 && recentFiltered.length === 0 && allFiltered.length === 0 ? (
              <p className="app-muted py-4 text-center text-xs">未找到模型，请先在设置中同步模型列表</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModelOption({
  model,
  active,
  onSelect,
  starred,
  onToggleFavorite,
}: {
  model: string;
  active: boolean;
  onSelect: (m: string) => void;
  starred?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, model: string) => void;
}) {
  return (
    <div className="flex items-center">
      <button
        onClick={() => onSelect(model)}
        className={`flex-1 px-3 py-2 text-left text-xs transition-colors ${
          active
            ? "bg-[color:var(--accent-soft)] font-medium text-[color:var(--accent)]"
            : "text-[color:var(--text-soft)] hover:bg-[color:var(--panel-muted)]"
        }`}
      >
        {model}
      </button>
      {onToggleFavorite ? (
        <button
          onClick={(e) => onToggleFavorite(e, model)}
          className={`shrink-0 px-2 py-2 transition-colors ${starred ? "text-amber-500" : "app-muted hover:text-amber-400"}`}
          title={starred ? "取消常用" : "加入常用"}
        >
          <Star size={12} fill={starred ? "currentColor" : "none"} />
        </button>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Eye, EyeOff, RefreshCw, Star, Trash2, X } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import type { ApiConfig } from "../types";

export default function SettingsPanel() {
  const { state, dispatch, fetchModels } = useChatContext();
  const [form, setForm] = useState<ApiConfig>({ ...state.config });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    function onOpen() {
      dispatch({ type: "TOGGLE_SETTINGS" });
    }
    window.addEventListener("cherrychat:open-settings", onOpen);
    return () => window.removeEventListener("cherrychat:open-settings", onOpen);
  }, [dispatch]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      endpoint: state.config.endpoint,
      apiKey: state.config.apiKey,
      maxTokens: state.config.maxTokens,
      historyRoundsLimit: state.config.historyRoundsLimit,
    }));
  }, [state.config.apiKey, state.config.endpoint, state.config.historyRoundsLimit, state.config.maxTokens]);

  if (!state.settingsOpen) return null;

  function handleSave() {
    dispatch({ type: "SET_CONFIG", payload: form });
    dispatch({ type: "TOGGLE_SETTINGS" });
  }

  async function handleTest() {
    setTestStatus("loading");
    setTestMsg("");
    try {
      const endpoint = form.endpoint.replace(/\/$/, "");
      const res = await fetch(`${endpoint}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${form.apiKey}`,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: form.model,
          max_tokens: 16,
          messages: [{ role: "user", content: "你好" }],
        }),
      });
      if (res.ok) {
        setTestStatus("ok");
        setTestMsg("连接成功");
      } else {
        setTestStatus("error");
        setTestMsg(`错误 ${res.status}`);
      }
    } catch (err) {
      setTestStatus("error");
      setTestMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleFetchModels() {
    if (!form.apiKey || !form.endpoint) {
      setTestMsg("请先在设置页填写 API Key");
      setTestStatus("error");
      return;
    }
    setTestStatus("loading");
    setTestMsg("模型同步中...");
    try {
      dispatch({ type: "SET_CONFIG", payload: form });
      const list = await fetchModels(form.endpoint, form.apiKey);
      setTestStatus("ok");
      setTestMsg(`模型已同步（${list.length} 个）`);
    } catch {
      setTestStatus("error");
      setTestMsg("获取模型列表失败");
    }
  }

  function handleClearAttachments() {
    const total = state.conversations.reduce((sum, c) => sum + c.messages.filter((m) => m.images && m.images.length > 0).length, 0);
    dispatch({ type: "CLEAR_ATTACHMENTS" });
    setTestStatus("ok");
    setTestMsg(`已清除 ${total} 条含附件的消息`);
  }

  const isFavorite = state.favoriteModels.includes(form.model);
  const allModelOptions = [...state.favoriteModels, ...state.models.filter((m) => !state.favoriteModels.includes(m))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm sm:items-start sm:pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: "TOGGLE_SETTINGS" });
      }}
    >
      <div className="flex max-h-screen w-full flex-col overflow-hidden rounded-none border border-[color:var(--line)] bg-[color:var(--panel-strong)] shadow-[var(--shadow)] sm:max-h-[80vh] sm:max-w-md sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-6 py-4">
          <h2 className="text-base font-semibold">聊天设置</h2>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
            className="app-muted rounded-lg p-1.5 transition-colors hover:bg-[color:var(--panel-muted)] hover:text-[color:var(--text)]"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-3">
            <div className="text-sm font-medium">接口地址已固定</div>
            <div className="app-muted mt-1 text-xs">聊天页会自动同步主设置中的主题和 API 参数。</div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-soft)]">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={form.apiKey}
                readOnly
                placeholder="将自动读取设置页中的 API Key"
                className="app-input cursor-not-allowed pr-10 opacity-80"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="app-muted absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-[color:var(--text)]"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="app-muted mt-1 text-[10px]">请在主设置页维护 API Key，这里只做同步展示。</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[color:var(--text-soft)]">默认模型</label>
              <button
                type="button"
                onClick={() => dispatch({ type: "TOGGLE_FAVORITE_MODEL", payload: form.model })}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                  isFavorite ? "bg-amber-500/10 text-amber-500" : "app-muted hover:text-amber-500"
                }`}
              >
                <Star size={12} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "已加入常用" : "加入常用"}
              </button>
            </div>

            {state.models.length > 0 ? (
              <select value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className="app-input">
                {allModelOptions.map((m) => (
                  <option key={m} value={m}>
                    {state.favoriteModels.includes(m) ? "⭐ " : ""}
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="claude-sonnet-4-6"
                className="app-input"
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-[color:var(--text-soft)]">输出回复上限</span>
              <input
                type="number"
                min={256}
                step={256}
                value={form.maxTokens}
                onChange={(e) => setForm((f) => ({ ...f, maxTokens: Number(e.target.value || 0) }))}
                className="app-input"
              />
              <span className="app-muted text-[10px]">默认已调到原来的 50 倍。</span>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-[color:var(--text-soft)]">最近保留轮数</span>
              <input
                type="number"
                min={1}
                max={200}
                value={form.historyRoundsLimit}
                onChange={(e) => setForm((f) => ({ ...f, historyRoundsLimit: Number(e.target.value || 0) }))}
                className="app-input"
              />
              <span className="app-muted text-[10px]">只向模型发送最近 N 轮用户对话，默认 60 轮。</span>
            </label>
          </div>

          {testStatus !== "idle" ? (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                testStatus === "ok"
                  ? "app-status-success bg-emerald-500/10"
                  : testStatus === "error"
                    ? "app-status-danger bg-red-500/10"
                    : "text-[color:var(--accent)] bg-[color:var(--accent-soft)]"
              }`}
            >
              {testStatus === "ok" ? <CheckCircle size={16} className="shrink-0" /> : null}
              {testStatus === "error" ? <AlertCircle size={16} className="shrink-0" /> : null}
              {testStatus === "loading" ? <RefreshCw size={16} className="shrink-0 animate-spin" /> : null}
              <span className="text-xs">{testMsg}</span>
            </div>
          ) : null}

          <div className="pt-1">
            <button
              onClick={handleClearAttachments}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/15"
            >
              <Trash2 size={13} />
              清除图片和文件缓存
            </button>
            <p className="app-muted mt-1 text-center text-[10px]">仅清除图片和 PDF 附件，文字消息会保留。</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--line)] bg-[color:var(--panel-muted)] px-6 py-4">
          <button
            onClick={handleFetchModels}
            disabled={testStatus === "loading"}
            className="app-button-secondary flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={testStatus === "loading" ? "animate-spin" : ""} />
            同步模型列表
          </button>
          <div className="flex gap-2">
            <button onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })} className="app-button-secondary px-4 py-2 text-sm">
              取消
            </button>
            <button
              onClick={() => {
                handleTest();
                handleSave();
              }}
              className="app-button-primary px-5 py-2 text-sm"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

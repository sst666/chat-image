"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Edit3, RefreshCw, Trash2 } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import type { Message } from "../types";

interface Props {
  message: Message;
}

function renderMarkdown(text: string): string {
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return html
    .split(/\n{2,}/)
    .map((block) => {
      if (
        block.startsWith("<h") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<pre") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<hr")
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

export default function MessageBubble({ message }: Props) {
  const { state, dispatch, regenerateMessage, sendMessage, updateMessage } = useChatContext();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const isUser = message.role === "user";
  const isPending = state.pendingMessageId === message.id;

  useEffect(() => {
    setDraft(message.content);
  }, [message.content]);

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!state.currentConvId || state.isLoading) return;
    setRegenerating(true);
    try {
      await regenerateMessage(state.currentConvId, message.id);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleResend() {
    if (!isUser || state.isLoading) return;
    await sendMessage(message.content, message.images, message.files);
  }

  function handleEdit() {
    if (!isUser || state.isLoading) return;
    setDraft(message.content);
    setIsEditing(true);
  }

  function handleConfirmEdit() {
    if (!state.currentConvId) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateMessage(state.currentConvId, message.id, trimmed);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setDraft(message.content);
    setIsEditing(false);
  }

  function handleDelete() {
    if (!state.currentConvId || state.isLoading) return;
    dispatch({
      type: "DELETE_MESSAGE",
      payload: { convId: state.currentConvId, messageId: message.id },
    });
  }

  return (
    <div className={`group flex items-start gap-2 px-2 py-2 sm:gap-3 sm:px-0 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--panel-muted)]">
          <span className="text-[10px] font-bold text-[color:var(--text-soft)]">你</span>
        </div>
      ) : (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, #60a5fa))" }}
        >
          <span className="text-[10px] font-bold">AI</span>
        </div>
      )}

      <div className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {message.images?.length ? (
          <div className="mb-1 flex flex-wrap gap-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`attachment-${i}`}
                className="max-h-[140px] max-w-[140px] rounded-lg border border-[color:var(--line)] object-cover sm:max-h-[200px] sm:max-w-[200px]"
              />
            ))}
          </div>
        ) : null}

        {message.files?.length ? (
          <div className="mb-1 flex flex-wrap gap-2">
            {message.files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className={`max-w-[220px] truncate rounded-md border px-2 py-1 text-[10px] ${
                  isUser
                    ? "border-white/25 bg-white/15 text-white"
                    : "border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--text-soft)]"
                }`}
                title={`${file.name}\n${file.mimeType}`}
              >
                {file.name}
              </div>
            ))}
          </div>
        ) : null}

        {message.content ? (
          <div
            className={`relative rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 ${
              isUser
                ? "rounded-tr-sm text-white"
                : "rounded-tl-sm border border-[color:var(--line)] bg-[color:var(--panel-muted)] text-[color:var(--text)]"
            }`}
            style={
              isUser
                ? { background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, #60a5fa))" }
                : undefined
            }
          >
            {isPending ? (
              <div className="flex items-center gap-1.5">
                <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              </div>
            ) : isUser && isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[96px] w-full resize-y rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-sm text-white outline-none placeholder:text-white/60"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/90 transition-colors hover:bg-white/10"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmEdit}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[color:var(--accent)] transition-colors hover:bg-white/90"
                  >
                    确认
                  </button>
                </div>
              </div>
            ) : isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none sm:prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="app-muted flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors hover:bg-[color:var(--panel-muted)] hover:text-[color:var(--text)]"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            {copied ? "已复制" : "复制"}
          </button>

          {isUser ? (
            <button
              onClick={handleEdit}
              disabled={state.isLoading || isEditing}
              className="app-muted flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] disabled:opacity-40"
            >
              <Edit3 size={11} />
              编辑
            </button>
          ) : null}

          {isUser ? (
            <button
              onClick={() => void handleResend()}
              disabled={state.isLoading}
              className="app-muted flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] disabled:opacity-40"
            >
              <RefreshCw size={11} />
              重新发送
            </button>
          ) : null}

          <button
            onClick={handleDelete}
            disabled={state.isLoading}
            className="app-muted flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 size={11} />
            删除
          </button>

          {!isUser ? (
            <button
              onClick={handleRegenerate}
              disabled={state.isLoading || regenerating}
              className="app-muted flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] disabled:opacity-40"
            >
              <RefreshCw size={11} className={regenerating ? "animate-spin" : ""} />
              重新生成
            </button>
          ) : null}

          {!isUser ? (
            <span className="app-muted px-1 text-[10px]">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useChatContext } from "../context/ChatContext";
import MessageBubble from "./MessageBubble";

export default function MessageList() {
  const { currentConversation, state } = useChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages.length, state.isLoading]);

  if (!currentConversation) return null;

  return (
    <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      {currentConversation.messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {state.isLoading && !state.pendingMessageId ? (
        <div className="flex items-start gap-3 py-2">
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, #60a5fa))" }}
          >
            <span className="text-[10px] font-bold">AI</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-4 py-3">
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}

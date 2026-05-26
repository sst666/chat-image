"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, Send, X } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import { useFileParser } from "../hooks/useFileParser";
import { usePdf } from "../hooks/usePdf";
import ModelSelector from "./ModelSelector";

const DRAFT_KEY_PREFIX = "bywlai-chat-draft:";

function getDraftKey(convId: string | null) {
  return `${DRAFT_KEY_PREFIX}${convId || "new"}`;
}

function readDraft(convId: string | null) {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(getDraftKey(convId)) || "";
  } catch {
    return "";
  }
}

function writeDraft(convId: string | null, text: string) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(convId);
    const value = String(text || "");
    if (!value) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch {}
}

export default function InputArea() {
  const { state, sendMessage } = useChatContext();
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<Array<{ name: string; mimeType: string; content: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const justSentAtRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pdfToImages } = usePdf();
  const { parseFiles } = useFileParser();
  const activeConvId = state.currentConvId ?? null;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    setText(readDraft(activeConvId));
  }, [activeConvId]);

  useEffect(() => {
    writeDraft(activeConvId, text);
  }, [activeConvId, text]);

  function focusTextarea() {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0 && files.length === 0) return;
    if (state.isLoading) return;

    setIsComposing(false);
    justSentAtRef.current = Date.now();
    const draftText = trimmed;
    setText("");
    writeDraft(activeConvId, "");
    const nextImages = [...images];
    const nextFiles = [...files];
    setImages([]);
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "44px";
    }

    try {
      await sendMessage(draftText, nextImages.length > 0 ? nextImages : undefined, nextFiles.length > 0 ? nextFiles : undefined);
      focusTextarea();
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isComposing || e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleImageFiles = useCallback(async (inputFiles: FileList | File[]) => {
    const results = await Promise.all(
      Array.from(inputFiles)
        .filter((file) => file.type.startsWith("image/"))
        .map(processImageFile)
    );
    setImages((prev) => [...prev, ...results]);
  }, []);

  const handlePasteImages = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageFiles = items
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean) as File[];
      if (!imageFiles.length) return;
      e.preventDefault();
      await handleImageFiles(imageFiles);
    },
    [handleImageFiles]
  );

  const handlePdfFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      const files = Array.from(inputFiles).filter((file) => file.type === "application/pdf");
      for (const file of files) {
        const pages = await pdfToImages(file);
        setImages((prev) => [...prev, ...pages]);
      }
    },
    [pdfToImages]
  );

  const handleDocumentFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      const files = Array.from(inputFiles).filter((file) => {
        const name = file.name.toLowerCase();
        return (
          name.endsWith(".docx") ||
          name.endsWith(".xlsx") ||
          name.endsWith(".xls") ||
          name.endsWith(".pptx") ||
          name.endsWith(".ppt") ||
          name.endsWith(".txt") ||
          name.endsWith(".csv") ||
          name.endsWith(".zip")
        );
      });
      if (!files.length) return;
      const parsed = await parseFiles(files);
      setFiles((prev) => [...prev, ...parsed]);
    },
    [parseFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const inputFiles = e.dataTransfer.files;
      const imageFiles = Array.from(inputFiles).filter((file) => file.type.startsWith("image/"));
      const pdfFiles = Array.from(inputFiles).filter((file) => file.type === "application/pdf");
      const documentFiles = Array.from(inputFiles).filter((file) => {
        const name = file.name.toLowerCase();
        return (
          name.endsWith(".docx") ||
          name.endsWith(".xlsx") ||
          name.endsWith(".xls") ||
          name.endsWith(".pptx") ||
          name.endsWith(".ppt") ||
          name.endsWith(".txt") ||
          name.endsWith(".csv") ||
          name.endsWith(".zip")
        );
      });
      if (imageFiles.length) await handleImageFiles(imageFiles);
      if (pdfFiles.length) await handlePdfFiles(pdfFiles);
      if (documentFiles.length) await handleDocumentFiles(documentFiles);
      focusTextarea();
    },
    [handleDocumentFiles, handleImageFiles, handlePdfFiles]
  );

  return (
    <div className="shrink-0 px-2 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-4">
      <div
        className={`rounded-2xl border bg-[color:var(--panel-strong)] transition-all ${
          isDragging
            ? "border-[color:var(--accent)] shadow-[0_16px_40px_rgba(37,99,235,0.14)]"
            : "border-[color:var(--line)] hover:border-[color:var(--accent)]/60"
        }`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, a, input[type='file'], select")) return;
          focusTextarea();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {images.map((img, i) => (
              <div key={i} className="group relative">
                <img src={img} alt={`preview-${i}`} className="h-14 w-14 rounded-lg border border-[color:var(--line)] object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {files.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="group relative rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-muted)] px-2 py-1.5">
                <div className="max-w-[180px] truncate text-[11px] text-[color:var(--text-soft)]">{file.name}</div>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="px-3 pb-1.5 pt-2.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => void handlePasteImages(e)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              if (Date.now() - justSentAtRef.current < 180) return;
              setText(e.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息...（Shift+Enter 换行）"
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-soft)]"
            style={{ minHeight: 44, maxHeight: 200 }}
          />
        </div>

        {state.isLoading ? (
          <div className="flex items-center gap-2 px-3 pb-1 text-[11px] app-muted">
            <span>AI 回复中</span>
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
            <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[color:var(--text-soft)]" />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="app-muted rounded-lg p-1.5 transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
              title="添加图片"
            >
              <ImageIcon size={16} />
            </button>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handlePdfFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="app-muted rounded-lg p-1.5 transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
              title="添加 PDF"
            >
              <FileText size={16} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.zip"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleDocumentFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="app-muted rounded-lg p-1.5 transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
              title="添加文档文件"
            >
              <Paperclip size={16} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="shrink-0">
              <ModelSelector />
            </div>
            <button
              title="发送"
              onClick={() => void handleSend()}
              disabled={state.isLoading || (!text.trim() && images.length === 0 && files.length === 0)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 42%, #60a5fa))" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
      <p className="app-muted mt-1.5 text-center text-[10px]">AI 生成内容仅供参考，重要信息请自行核对。</p>
    </div>
  );
}

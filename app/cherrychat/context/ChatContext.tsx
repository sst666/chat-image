"use client";

import React, { createContext, useCallback, useContext, useReducer } from "react";
import type { ApiConfig, Conversation, Message } from "../types";
import { readClientSettings } from "@/lib/client-settings";

const LS_SETTINGS = "bywlai-settings";
const LS_CONVERSATIONS = "bywlai-conversations";
const LS_CURRENT_ID = "bywlai-current-conv-id";
const LS_RECENT_MODELS = "bywlai-recent-models";
const LS_FAVORITE_MODELS = "bywlai-favorite-models";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

interface State {
  conversations: Conversation[];
  currentConvId: string | null;
  config: ApiConfig;
  recentModels: string[];
  favoriteModels: string[];
  models: string[];
  isLoading: boolean;
  pendingMessageId: string | null;
  settingsOpen: boolean;
  searchQuery: string;
}

type Action =
  | { type: "SET_CONFIG"; payload: ApiConfig }
  | { type: "CREATE_CONVERSATION"; payload: Conversation }
  | { type: "NEW_CONVERSATION" }
  | { type: "SELECT_CONVERSATION"; payload: string }
  | { type: "DELETE_CONVERSATION"; payload: string }
  | { type: "RENAME_CONVERSATION"; payload: { id: string; title: string } }
  | { type: "ADD_MESSAGE"; payload: { convId: string; message: Message } }
  | { type: "UPDATE_MESSAGE"; payload: { convId: string; messageId: string; content: string; timestamp?: number } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PENDING_MESSAGE_ID"; payload: string | null }
  | { type: "SET_SETTINGS_OPEN"; payload: boolean }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "ADD_RECENT_MODEL"; payload: string }
  | { type: "SET_MODEL"; payload: string }
  | { type: "SET_MODELS"; payload: string[] }
  | { type: "TOGGLE_FAVORITE_MODEL"; payload: string }
  | { type: "CLEAR_ATTACHMENTS" }
  | { type: "DELETE_MESSAGE"; payload: { convId: string; messageId: string } };

function createConversation(model: string): Conversation {
  const now = Date.now();
  return {
    id: generateId(),
    title: "新对话",
    messages: [],
    model,
    createdAt: now,
    updatedAt: now,
  };
}

function deriveConversationTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user" && message.content.trim());
  return firstUserMessage?.content.slice(0, 50) || "新对话";
}

function clampInt(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function trimMessagesByRounds(messages: Message[], roundsLimit: number) {
  if (!messages.length) return messages;
  const limit = clampInt(roundsLimit, 60, 1, 200);
  let userRounds = 0;
  let startIndex = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      userRounds += 1;
      if (userRounds > limit) {
        startIndex = index + 1;
        break;
      }
    }
  }

  return messages.slice(startIndex);
}

function normalizeChatConfig(config: Partial<ApiConfig> | null | undefined): ApiConfig {
  return {
    endpoint: String(config?.endpoint || "https://api.bywlai.cn"),
    apiKey: String(config?.apiKey || ""),
    model: String(config?.model || "claude-sonnet-4-6"),
    maxTokens: clampInt(Number(config?.maxTokens), 204800, 256, 400000),
    historyRoundsLimit: clampInt(Number(config?.historyRoundsLimit), 60, 1, 200),
  };
}

function getRuntimeConfig(config: ApiConfig): ApiConfig {
  const client = readClientSettings();
  const endpoint = String(client.baseUrl || config.endpoint || "").trim() || config.endpoint;
  const apiKey = String(client.apiKey || "").trim() || config.apiKey;
  return {
    ...config,
    endpoint,
    apiKey,
  };
}

function buildFilePrompt(files?: Message["files"]): string {
  if (!files?.length) return "";
  return files
    .map((file, idx) => `【附件${idx + 1}】文件名: ${file.name}\n类型: ${file.mimeType}\n内容摘要:\n${file.content}`)
    .join("\n\n");
}

function toApiMessage(message: Message) {
  const filePrompt = buildFilePrompt(message.files);
  const text = [message.content, filePrompt ? `附件解析内容:\n${filePrompt}` : ""].filter(Boolean).join("\n\n");

  if (message.images && message.images.length > 0) {
    const contentParts: unknown[] = message.images.map((img) => ({
      type: "image_url",
      image_url: { url: img },
    }));
    if (text) {
      contentParts.unshift({ type: "text", text });
    }
    return { role: message.role, content: contentParts };
  }

  return { role: message.role, content: text };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CONFIG": {
      saveJson(LS_SETTINGS, action.payload);
      return { ...state, config: action.payload };
    }
    case "CREATE_CONVERSATION": {
      const conversations = [action.payload, ...state.conversations];
      saveJson(LS_CONVERSATIONS, conversations);
      saveJson(LS_CURRENT_ID, action.payload.id);
      return { ...state, conversations, currentConvId: action.payload.id };
    }
    case "NEW_CONVERSATION": {
      const conv = createConversation(state.config.model);
      const conversations = [conv, ...state.conversations];
      saveJson(LS_CONVERSATIONS, conversations);
      saveJson(LS_CURRENT_ID, conv.id);
      return { ...state, conversations, currentConvId: conv.id };
    }
    case "SELECT_CONVERSATION": {
      saveJson(LS_CURRENT_ID, action.payload);
      return { ...state, currentConvId: action.payload };
    }
    case "DELETE_CONVERSATION": {
      const conversations = state.conversations.filter((c) => c.id !== action.payload);
      let currentConvId = state.currentConvId;
      if (currentConvId === action.payload) {
        currentConvId = conversations[0]?.id ?? null;
      }
      saveJson(LS_CONVERSATIONS, conversations);
      saveJson(LS_CURRENT_ID, currentConvId);
      return { ...state, conversations, currentConvId };
    }
    case "RENAME_CONVERSATION": {
      const conversations = state.conversations.map((c) =>
        c.id === action.payload.id ? { ...c, title: action.payload.title } : c
      );
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, conversations };
    }
    case "ADD_MESSAGE": {
      const conversations = state.conversations.map((c) => {
        if (c.id !== action.payload.convId) return c;
        const messages = [...c.messages, action.payload.message];
        return { ...c, messages, title: deriveConversationTitle(messages), updatedAt: Date.now() };
      });
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, conversations };
    }
    case "UPDATE_MESSAGE": {
      const conversations = state.conversations.map((c) => {
        if (c.id !== action.payload.convId) return c;
        const messages = c.messages.map((message) =>
          message.id === action.payload.messageId
            ? {
                ...message,
                content: action.payload.content,
                timestamp: action.payload.timestamp ?? message.timestamp,
              }
            : message
        );
        return { ...c, messages, title: deriveConversationTitle(messages), updatedAt: Date.now() };
      });
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, conversations };
    }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_PENDING_MESSAGE_ID":
      return { ...state, pendingMessageId: action.payload };
    case "SET_SETTINGS_OPEN":
      return { ...state, settingsOpen: action.payload };
    case "TOGGLE_SETTINGS":
      return { ...state, settingsOpen: !state.settingsOpen };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };
    case "ADD_RECENT_MODEL": {
      const recentModels = [action.payload, ...state.recentModels.filter((m) => m !== action.payload)].slice(0, 8);
      saveJson(LS_RECENT_MODELS, recentModels);
      return { ...state, recentModels };
    }
    case "SET_MODEL": {
      const config = { ...state.config, model: action.payload };
      const conversations = state.conversations.map((c) =>
        c.id === state.currentConvId ? { ...c, model: action.payload } : c
      );
      saveJson(LS_SETTINGS, config);
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, config, conversations };
    }
    case "SET_MODELS":
      return { ...state, models: action.payload };
    case "TOGGLE_FAVORITE_MODEL": {
      const favoriteModels = state.favoriteModels.includes(action.payload)
        ? state.favoriteModels.filter((m) => m !== action.payload)
        : [...state.favoriteModels, action.payload];
      saveJson(LS_FAVORITE_MODELS, favoriteModels);
      return { ...state, favoriteModels };
    }
    case "CLEAR_ATTACHMENTS": {
      const conversations = state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((message) => ({ ...message, images: undefined })),
      }));
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, conversations };
    }
    case "DELETE_MESSAGE": {
      const conversations = state.conversations.map((c) => {
        if (c.id !== action.payload.convId) return c;
        const messages = c.messages.filter((message) => message.id !== action.payload.messageId);
        return { ...c, messages, title: deriveConversationTitle(messages), updatedAt: Date.now() };
      });
      saveJson(LS_CONVERSATIONS, conversations);
      return { ...state, conversations };
    }
    default:
      return state;
  }
}

interface ChatContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  currentConversation: Conversation | null;
  sendMessage: (content: string, images?: string[], files?: Message["files"]) => Promise<void>;
  fetchModels: (endpoint?: string, apiKey?: string) => Promise<string[]>;
  regenerateMessage: (convId: string, messageId: string) => Promise<void>;
  updateMessage: (convId: string, messageId: string, content: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const config = normalizeChatConfig(loadJson<Partial<ApiConfig>>(LS_SETTINGS, {
      endpoint: "https://api.bywlai.cn",
      apiKey: "",
      model: "claude-sonnet-4-6",
      maxTokens: 204800,
      historyRoundsLimit: 60,
    }));
    const conversations = loadJson<Conversation[]>(LS_CONVERSATIONS, []);
    const savedId = loadJson<string | null>(LS_CURRENT_ID, null);
    const currentConvId = savedId && conversations.find((c) => c.id === savedId) ? savedId : conversations[0]?.id ?? null;
    return {
      conversations,
      currentConvId,
      config,
      recentModels: loadJson<string[]>(LS_RECENT_MODELS, []),
      favoriteModels: loadJson<string[]>(LS_FAVORITE_MODELS, []),
      models: [],
      isLoading: false,
      pendingMessageId: null,
      settingsOpen: false,
      searchQuery: "",
    };
  });

  const currentConversation = state.conversations.find((c) => c.id === state.currentConvId) ?? null;

  const sendMessage = useCallback(
    async (content: string, images?: string[], files?: Message["files"]) => {
      const activeConversation = state.currentConvId
        ? state.conversations.find((conversation) => conversation.id === state.currentConvId) ?? null
        : null;
      const conversation = activeConversation ?? createConversation(state.config.model);
      const convId = conversation.id;

      if (!activeConversation) {
        dispatch({ type: "CREATE_CONVERSATION", payload: conversation });
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content,
        images,
        files,
        timestamp: Date.now(),
      };

      dispatch({ type: "ADD_MESSAGE", payload: { convId, message: userMsg } });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_PENDING_MESSAGE_ID", payload: null });

      try {
        const runtimeConfig = getRuntimeConfig(state.config);
        const history = [...conversation.messages, userMsg];
        const apiMessages = trimMessagesByRounds(history, runtimeConfig.historyRoundsLimit).map(toApiMessage);
        const model = conversation.model ?? runtimeConfig.model;
        const endpoint = runtimeConfig.endpoint.replace(/\/$/, "");

        const res = await fetch(`${endpoint}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${runtimeConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: clampInt(runtimeConfig.maxTokens, 204800, 256, 400000),
            messages: apiMessages,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API error ${res.status}: ${err}`);
        }

        const data = await res.json();
        const assistantMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: data?.choices?.[0]?.message?.content ?? "",
          timestamp: Date.now(),
        };

        dispatch({ type: "ADD_MESSAGE", payload: { convId, message: assistantMsg } });
        dispatch({ type: "ADD_RECENT_MODEL", payload: model });
      } catch (err) {
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            convId,
            message: {
              id: generateId(),
              role: "assistant",
              content: `错误：${err instanceof Error ? err.message : String(err)}`,
              timestamp: Date.now(),
            },
          },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({ type: "SET_PENDING_MESSAGE_ID", payload: null });
      }
    },
    [state.currentConvId, state.conversations, state.config]
  );

  const fetchModels = useCallback(
    async (endpoint?: string, apiKey?: string): Promise<string[]> => {
      const runtimeConfig = getRuntimeConfig(state.config);
      const ep = endpoint ?? runtimeConfig.endpoint;
      const key = apiKey ?? runtimeConfig.apiKey;
      if (!key || !ep) return [];
      try {
        const res = await fetch(`${ep.replace(/\/$/, "")}/v1/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let list: string[] = [];
        if (Array.isArray(data.data)) {
          list = data.data.map((m: { id: string }) => m.id);
        } else if (Array.isArray(data.models)) {
          list = data.models.map((m: { id: string }) => m.id);
        } else if (Array.isArray(data)) {
          list = data.map((m: string | { id: string }) => (typeof m === "string" ? m : m.id));
        }
        dispatch({ type: "SET_MODELS", payload: list });
        return list;
      } catch {
        return [];
      }
    },
    [state.config]
  );

  const regenerateMessage = useCallback(
    async (convId: string, messageId: string): Promise<void> => {
      const conv = state.conversations.find((c) => c.id === convId);
      if (!conv) return;
      const msgIdx = conv.messages.findIndex((m) => m.id === messageId);
      if (msgIdx === -1) return;

      const targetMessage = conv.messages[msgIdx];
      if (targetMessage.role !== "assistant") return;

      const runtimeConfig = getRuntimeConfig(state.config);
      const history = conv.messages.slice(0, msgIdx);
      const apiMessages = trimMessagesByRounds(history, runtimeConfig.historyRoundsLimit).map(toApiMessage);
      const model = conv.model ?? runtimeConfig.model;
      const endpoint = runtimeConfig.endpoint.replace(/\/$/, "");

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_PENDING_MESSAGE_ID", payload: messageId });

      try {
        const res = await fetch(`${endpoint}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${runtimeConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: clampInt(runtimeConfig.maxTokens, 204800, 256, 400000),
            messages: apiMessages,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API error ${res.status}: ${err}`);
        }
        const data = await res.json();
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            convId,
            messageId,
            content: data?.choices?.[0]?.message?.content ?? "",
            timestamp: Date.now(),
          },
        });
        dispatch({ type: "ADD_RECENT_MODEL", payload: model });
      } catch (err) {
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            convId,
            messageId,
            content: `错误：${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({ type: "SET_PENDING_MESSAGE_ID", payload: null });
      }
    },
    [state.conversations, state.config]
  );

  const updateMessage = useCallback((convId: string, messageId: string, content: string): void => {
    dispatch({
      type: "UPDATE_MESSAGE",
      payload: { convId, messageId, content, timestamp: Date.now() },
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        state,
        dispatch,
        currentConversation,
        sendMessage,
        fetchModels,
        regenerateMessage,
        updateMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

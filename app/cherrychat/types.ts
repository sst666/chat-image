export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 data URLs
  files?: ParsedFileAttachment[];
  timestamp: number;
}

export interface ParsedFileAttachment {
  name: string;
  mimeType: string;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  historyRoundsLimit: number;
}

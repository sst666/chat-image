export type EntryType = "main" | "detail";
export type Fidelity = "high" | "medium" | "low";
export type UploadKind = "product" | "model" | "detail" | "scene" | "other";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ImageStatus = "queued" | "paused" | "running" | "completed" | "failed" | "cancelled";

export interface PromptEntry {
  id: string;
  type: EntryType;
  title: string;
  defaultPrompt: string;
  size: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTask {
  id: string;
  entryId: string;
  type: EntryType;
  title: string;
  size: string;
  prompt: string;
  referenceKind?: UploadKind;
}

export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  kind: UploadKind;
  mimeType: string;
  createdAt: string;
}

export interface ProductInput {
  title: string;
  customRequirement: string;
  requirements: string[];
  fidelity: Fidelity;
  uploads: UploadedImage[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  tasks: PromptTask[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  baseUrl: string;
  apiKey: string;
  promptModel: string;
  imageModel: string;
  concurrency: number;
  retries: number;
}

export interface GeneratedImage {
  id: string;
  taskId: string;
  title: string;
  prompt: string;
  size: string;
  status: ImageStatus;
  progress: number;
  outputPath?: string;
  outputUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface GenerationJob {
  id: string;
  title: string;
  product: ProductInput;
  tasks: PromptTask[];
  images: GeneratedImage[];
  concurrency?: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AppLog {
  id: string;
  type: "generation" | "error";
  message: string;
  detail?: string;
  createdAt: string;
}

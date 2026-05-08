import { PromptEntry, PromptTask, UploadedImage } from "./types";
import { createId } from "./id";

export type Fidelity = "high" | "medium" | "low";

export interface WorkbenchTask {
  id: string;
  name: string;
  title: string;
  customRequirement: string;
  requirements: string[];
  fidelity: Fidelity;
  uploads: UploadedImage[];
  tasks: PromptTask[];
  jobId: string;
  dualThread: boolean;
}

export interface WorkbenchState {
  workbenches: WorkbenchTask[];
  activeWorkbenchId: string;
}

export const storageKey = "tb-ai-workbench-v3";

export function buildTasks(entries: PromptEntry[]): PromptTask[] {
  return entries.map((item) => ({
    id: createId(),
    entryId: item.id,
    type: item.type,
    title: item.title,
    size: item.size,
    prompt: item.defaultPrompt,
    enabled: true,
  }));
}

export function readWorkbenchState(): WorkbenchState {
  if (typeof window === "undefined") return { workbenches: [], activeWorkbenchId: "" };
  const raw = localStorage.getItem(storageKey);
  if (!raw) return { workbenches: [], activeWorkbenchId: "" };
  try {
    const parsed = JSON.parse(raw) as WorkbenchState;
    return {
      workbenches: (parsed.workbenches ?? []).map((workbench) => ({
        ...workbench,
        tasks: (workbench.tasks ?? []).map((task) => ({
          ...task,
          enabled: task.enabled ?? true,
        })),
      })),
      activeWorkbenchId: parsed.activeWorkbenchId ?? "",
    };
  } catch {
    return { workbenches: [], activeWorkbenchId: "" };
  }
}

export function writeWorkbenchState(state: WorkbenchState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(state));
}

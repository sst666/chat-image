import { promises as fs } from "fs";
import path from "path";
import { defaultEntries, defaultSettings } from "./defaults";
import { resolveProjectRoot } from "./project-root";
import { AppLog, AppSettings, GeneratedImage, GenerationJob, PromptEntry } from "./types";

const root = resolveProjectRoot();
const dataDir = path.join(root, "data");

const files = {
  entries: path.join(dataDir, "entries.json"),
  settings: path.join(dataDir, "settings.json"),
  jobs: path.join(dataDir, "jobs.json"),
  logs: path.join(dataDir, "logs.json"),
};

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(path.join(root, "public", "uploads"), { recursive: true });
  await fs.mkdir(path.join(root, "public", "outputs"), { recursive: true });
}

async function ensureDataDirSafe() {
  try {
    await ensureDataDir();
    return true;
  } catch (error) {
    console.error("[storage] ensureDataDir failed:", error);
    return false;
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  const ready = await ensureDataDirSafe();
  if (!ready) return fallback;
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("[storage] readJson fallback for", file, error);
    try {
      await writeJson(file, fallback);
    } catch (writeError) {
      console.error("[storage] writeJson fallback failed for", file, writeError);
    }
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function normalizeSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  const primaryImageModel = String(settings?.imageModel || defaultSettings.imageModel).trim() || defaultSettings.imageModel;
  const backupImageModels = Array.isArray(settings?.backupImageModels)
    ? settings?.backupImageModels
    : defaultSettings.backupImageModels;
  const normalizedBackups = backupImageModels
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index && item !== primaryImageModel);

  return {
    ...defaultSettings,
    ...settings,
    baseUrl: String(settings?.baseUrl || defaultSettings.baseUrl),
    apiKey: String(settings?.apiKey || ""),
    promptModel: String(settings?.promptModel || defaultSettings.promptModel),
    imageModel: primaryImageModel,
    backupImageModels: normalizedBackups,
    concurrency: Number(settings?.concurrency || defaultSettings.concurrency),
    retries: Number(settings?.retries || defaultSettings.retries),
  };
}

export async function getEntries() {
  return readJson<PromptEntry[]>(files.entries, defaultEntries);
}

export async function saveEntries(entries: PromptEntry[]) {
  await writeJson(files.entries, entries);
  return entries;
}

export async function getSettings() {
  try {
    const settings = await readJson<Partial<AppSettings>>(files.settings, defaultSettings);
    return normalizeSettings(settings);
  } catch (error) {
    console.error("[storage] getSettings failed:", error);
    return normalizeSettings(defaultSettings);
  }
}

export async function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);
  await writeJson(files.settings, normalized);
  return normalized;
}

export async function getJobs() {
  return readJson<GenerationJob[]>(files.jobs, []);
}

export async function saveJobs(jobs: GenerationJob[]) {
  await writeJson(files.jobs, jobs);
  return jobs;
}

export async function updateJob(job: GenerationJob) {
  const jobs = await getJobs();
  const mergeImages = (oldImages: GeneratedImage[], newImages: GeneratedImage[]) => {
    const map = new Map<string, GeneratedImage>();
    for (const img of oldImages) map.set(img.id, img);
    const rank: Record<string, number> = {
      queued: 0,
      paused: 1,
      running: 2,
      failed: 3,
      cancelled: 3,
      completed: 4,
    };
    for (const incoming of newImages) {
      const existed = map.get(incoming.id);
      if (!existed) {
        map.set(incoming.id, incoming);
        continue;
      }
      const useIncoming = rank[incoming.status] >= rank[existed.status];
      const merged: GeneratedImage = {
        ...existed,
        ...(useIncoming ? incoming : {}),
        progress: Math.max(existed.progress ?? 0, incoming.progress ?? 0),
        outputPath: incoming.outputPath || existed.outputPath,
        outputUrl: incoming.outputUrl || existed.outputUrl,
        error: incoming.error || existed.error,
        startedAt: existed.startedAt || incoming.startedAt,
        completedAt: incoming.completedAt || existed.completedAt,
      };
      map.set(incoming.id, merged);
    }
    return Array.from(map.values());
  };

  const mergeTasks = (oldTasks: GenerationJob["tasks"], newTasks: GenerationJob["tasks"]) => {
    const map = new Map<string, GenerationJob["tasks"][number]>();
    for (const task of oldTasks) map.set(task.id, task);
    for (const task of newTasks) map.set(task.id, task);
    return Array.from(map.values());
  };

  const next = jobs.some((item) => item.id === job.id)
    ? jobs.map((item) => {
        if (item.id !== job.id) return item;
        return {
          ...item,
          ...job,
          tasks: mergeTasks(item.tasks, job.tasks),
          images: mergeImages(item.images, job.images),
        };
      })
    : [job, ...jobs];
  await saveJobs(next);
  return job;
}

export async function replaceJob(job: GenerationJob) {
  const jobs = await getJobs();
  const next = jobs.some((item) => item.id === job.id)
    ? jobs.map((item) => (item.id === job.id ? job : item))
    : [job, ...jobs];
  await saveJobs(next);
  return job;
}

export async function getJob(id: string) {
  const jobs = await getJobs();
  return jobs.find((job) => job.id === id);
}

export function toImageUrl(outputPath: string) {
  const relative = outputPath.split(`${path.sep}public${path.sep}outputs${path.sep}`)[1] ?? path.basename(outputPath);
  return `/api/images/${relative.split(path.sep).map(encodeURIComponent).join("/")}`;
}

export async function getLogs() {
  try {
    return await readJson<AppLog[]>(files.logs, []);
  } catch (error) {
    console.error("[storage] getLogs failed:", error);
    return [];
  }
}

export async function appendLog(log: Omit<AppLog, "id" | "createdAt">) {
  const logs = await getLogs();
  const entry: AppLog = {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    ...log,
  };
  await writeJson(files.logs, [entry, ...logs].slice(0, 500));
  return entry;
}

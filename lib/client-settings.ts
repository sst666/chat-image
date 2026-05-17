import { defaultSettings } from "./defaults";
import type { AppSettings } from "./types";

export const CLIENT_SETTINGS_KEY = "tb-ai-image-settings-v1";

export function normalizeClientSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const imageModel = String(input?.imageModel || defaultSettings.imageModel).trim() || defaultSettings.imageModel;
  const backupImageModels = Array.isArray(input?.backupImageModels) ? input!.backupImageModels : defaultSettings.backupImageModels;
  const normalizedBackups = backupImageModels
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index && item !== imageModel);
  const retries = Number(input?.retries ?? defaultSettings.retries);

  return {
    ...defaultSettings,
    ...input,
    baseUrl: String(input?.baseUrl || defaultSettings.baseUrl),
    apiKey: String(input?.apiKey || ""),
    promptModel: String(input?.promptModel || defaultSettings.promptModel),
    imageModel,
    backupImageModels: normalizedBackups,
    concurrency: 1,
    retries: Number.isFinite(retries) ? Math.max(0, Math.min(5, Math.round(retries))) : defaultSettings.retries,
  };
}

export function readClientSettings(): AppSettings {
  if (typeof window === "undefined") return normalizeClientSettings(defaultSettings);
  try {
    const raw = localStorage.getItem(CLIENT_SETTINGS_KEY);
    if (!raw) return normalizeClientSettings(defaultSettings);
    return normalizeClientSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return normalizeClientSettings(defaultSettings);
  }
}

export function writeClientSettings(settings: Partial<AppSettings>) {
  if (typeof window === "undefined") return normalizeClientSettings(settings);
  const normalized = normalizeClientSettings(settings);
  localStorage.setItem(CLIENT_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

import type { AppSettings } from "./types";

const runtimeSettingsByJobId = new Map<string, AppSettings>();

export function setRuntimeSettings(jobId: string, settings: AppSettings) {
  if (!jobId) return;
  runtimeSettingsByJobId.set(jobId, settings);
}

export function getRuntimeSettings(jobId: string) {
  return runtimeSettingsByJobId.get(jobId);
}

export function clearRuntimeSettings(jobId: string) {
  runtimeSettingsByJobId.delete(jobId);
}

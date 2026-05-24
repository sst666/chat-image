import { promises as fs } from "fs";
import path from "path";
import { resolveProjectRoot } from "./project-root";

export function resolveUploadsDir() {
  const customDir = process.env.UPLOAD_DIR || process.env.TB_UPLOAD_DIR;
  if (customDir) return path.resolve(customDir);
  return path.join(resolveProjectRoot(), "data", "uploads");
}

function resolveLegacyUploadsDir() {
  return path.join(resolveProjectRoot(), "public", "uploads");
}

export async function ensureUploadsDir() {
  await fs.mkdir(resolveUploadsDir(), { recursive: true });
}

export function extractUploadFilename(rawUrl: string, fallbackFilename?: string) {
  if (fallbackFilename) return decodeURIComponent(String(fallbackFilename));
  const raw = String(rawUrl || "");
  if (!raw) return "";
  if (raw.startsWith("/api/uploads/")) return decodeURIComponent(raw.slice("/api/uploads/".length));
  if (raw.startsWith("/uploads/")) return decodeURIComponent(raw.slice("/uploads/".length));
  return decodeURIComponent(raw.replace(/^\//, ""));
}

export function resolveUploadFilePath(filename: string) {
  return path.join(resolveUploadsDir(), filename);
}

export async function readUploadFileByFilename(filename: string) {
  const normalized = decodeURIComponent(String(filename || ""));
  const newPath = resolveUploadFilePath(normalized);
  try {
    return await fs.readFile(newPath);
  } catch {
    const legacyPath = path.join(resolveLegacyUploadsDir(), normalized);
    return await fs.readFile(legacyPath);
  }
}

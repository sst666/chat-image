import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { resolveProjectRoot } from "./project-root";

let cachedUploadsDir = "";

function uniquePaths(input: string[]) {
  const list: string[] = [];
  for (const item of input) {
    const normalized = path.resolve(item);
    if (list.includes(normalized)) continue;
    list.push(normalized);
  }
  return list;
}

function getUploadCandidates() {
  const root = resolveProjectRoot();
  const customDir = process.env.UPLOAD_DIR || process.env.TB_UPLOAD_DIR;
  return uniquePaths([
    customDir ? path.resolve(customDir) : "",
    path.join(root, "data", "uploads"),
    path.join(root, "public", "uploads"),
    path.join(os.tmpdir(), "chat-image", "uploads"),
  ].filter(Boolean));
}

async function canWriteDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.probe-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

export function resolveUploadsDir() {
  if (cachedUploadsDir) return cachedUploadsDir;
  return getUploadCandidates()[0];
}

function resolveLegacyUploadsDir() {
  return path.join(resolveProjectRoot(), "public", "uploads");
}

export async function ensureUploadsDir() {
  if (cachedUploadsDir) {
    if (await canWriteDir(cachedUploadsDir)) return cachedUploadsDir;
    cachedUploadsDir = "";
  }
  const candidates = getUploadCandidates();
  for (const dir of candidates) {
    if (await canWriteDir(dir)) {
      cachedUploadsDir = dir;
      return dir;
    }
  }
  throw new Error("上传目录不可写，请检查容器挂载目录或设置 UPLOAD_DIR");
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
  const candidates = uniquePaths([
    resolveUploadFilePath(normalized),
    ...getUploadCandidates().map((dir) => path.join(dir, normalized)),
    path.join(resolveLegacyUploadsDir(), normalized),
  ]);
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {}
  }
  throw new Error("上传文件不存在");
}

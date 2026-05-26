import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { resolveProjectRoot } from "./project-root";

const root = resolveProjectRoot();
let cachedOutputsDir = "";

function uniquePaths(input: string[]) {
  const list: string[] = [];
  for (const item of input) {
    const normalized = path.resolve(item);
    if (list.includes(normalized)) continue;
    list.push(normalized);
  }
  return list;
}

function getOutputCandidates() {
  const customDir = process.env.OUTPUT_DIR || process.env.TB_OUTPUT_DIR;
  return uniquePaths([
    customDir ? path.resolve(customDir) : "",
    path.join(root, "public", "outputs"),
    path.join(root, "data", "outputs"),
    path.join(os.tmpdir(), "chat-image", "outputs"),
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

export async function ensureOutputsDir() {
  if (cachedOutputsDir) {
    if (await canWriteDir(cachedOutputsDir)) return cachedOutputsDir;
    cachedOutputsDir = "";
  }
  for (const dir of getOutputCandidates()) {
    if (await canWriteDir(dir)) {
      cachedOutputsDir = dir;
      return dir;
    }
  }
  throw new Error("输出目录不可写，请检查 public/outputs 挂载目录或设置 OUTPUT_DIR");
}

export function getOutputDirsForRead() {
  return uniquePaths([
    cachedOutputsDir,
    ...getOutputCandidates(),
  ].filter(Boolean));
}

export function toOutputApiPath(outputPath: string) {
  const normalizedOutput = path.resolve(outputPath);
  for (const dir of getOutputDirsForRead()) {
    const rel = path.relative(dir, normalizedOutput);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      return rel.split(path.sep).map(encodeURIComponent).join("/");
    }
  }
  return path.basename(outputPath);
}

export function resolveOutputPathFromApiPath(pathParts: string[]) {
  const decodedRel = pathParts.map((item) => decodeURIComponent(item)).join(path.sep);
  for (const dir of getOutputDirsForRead()) {
    const full = path.resolve(dir, decodedRel);
    const rel = path.relative(dir, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    return full;
  }
  return null;
}

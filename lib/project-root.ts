import path from "path";

export function resolveProjectRoot() {
  const cwd = process.cwd();
  const normalized = cwd.replace(/\\/g, "/");
  if (normalized.endsWith("/.next/standalone")) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

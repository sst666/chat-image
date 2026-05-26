import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { resolveOutputPathFromApiPath } from "@/lib/output-storage";

const mimeMap: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_: Request, { params }: { params: { path: string[] } }) {
  const full = resolveOutputPathFromApiPath(params.path || []);
  if (!full) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
  try {
    const data = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeMap[ext] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}

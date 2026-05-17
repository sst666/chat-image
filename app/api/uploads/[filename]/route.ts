import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/project-root";

const mimeMap: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_: Request, { params }: { params: { filename: string } }) {
  const filename = decodeURIComponent(params.filename || "");
  const full = path.join(resolveProjectRoot(), "public", "uploads", filename);
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

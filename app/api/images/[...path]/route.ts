import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const mimeMap: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_: Request, { params }: { params: { path: string[] } }) {
  const rel = params.path.map(decodeURIComponent).join(path.sep);
  const full = path.join(process.cwd(), "public", "outputs", rel);
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

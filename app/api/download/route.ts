import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getJob } from "@/lib/storage";

function getContentTypeByExt(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function safeName(input: string) {
  const value = String(input || "image")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();
  return value || "image";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });
  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const sortedImages = [...job.images]
    .filter((item) => item.outputPath)
    .sort((a, b) => {
      const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
      const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
      return bTime - aTime;
    });

  for (const img of sortedImages) {
    const filePath = String(img.outputPath);
    try {
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath) || ".png";
      const filename = `${safeName(job.title)}-${safeName(img.title || img.id)}${ext}`;
      return new NextResponse(data, {
        headers: {
          "Content-Type": getContentTypeByExt(filePath),
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "当前任务暂无可下载图片" }, { status: 404 });
}

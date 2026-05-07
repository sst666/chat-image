import { promises as fs } from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { NextResponse } from "next/server";
import { getJob } from "@/lib/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });
  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  const zip = new AdmZip();
  for (const img of job.images.filter((i) => i.outputPath)) {
    const p = img.outputPath as string;
    try {
      const data = await fs.readFile(p);
      zip.addFile(path.basename(p), data);
    } catch {
      continue;
    }
  }
  return new NextResponse(zip.toBuffer(), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(job.title)}-${job.id}.zip"`,
    },
  });
}

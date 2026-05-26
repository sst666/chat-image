import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { ensureUploadsDir } from "@/lib/upload-storage";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const kind = String(form.get("kind") || "product");
    if (!file) return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".png";
    const filename = `${uuid()}${ext}`;
    const uploadDir = await ensureUploadsDir();
    const out = path.join(uploadDir, filename);
    await fs.writeFile(out, bytes);
    return NextResponse.json({
      id: uuid(),
      filename,
      originalName: file.name,
      url: `/api/uploads/${encodeURIComponent(filename)}`,
      kind,
      mimeType: file.type || "image/png",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/upload] upload failed:", error);
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}

import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") || "product");
  if (!file) return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${uuid()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, filename);
  await fs.writeFile(out, bytes);
  return NextResponse.json({
    id: uuid(),
    filename,
    originalName: file.name,
    url: `/uploads/${filename}`,
    kind,
    mimeType: file.type || "image/png",
    createdAt: new Date().toISOString(),
  });
}

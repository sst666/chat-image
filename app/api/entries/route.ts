import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getEntries, saveEntries } from "@/lib/storage";
import { PromptEntry } from "@/lib/types";

export async function GET() {
  const data = await getEntries();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<PromptEntry>;
  const list = await getEntries();
  const now = new Date().toISOString();
  const item: PromptEntry = {
    id: uuid(),
    type: body.type ?? "main",
    title: body.title ?? "未命名词条",
    defaultPrompt: body.defaultPrompt ?? "",
    size: body.size ?? (body.type === "detail" ? "800x1200" : "800x800"),
    createdAt: now,
    updatedAt: now,
  };
  const next = [...list, item];
  await saveEntries(next);
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const body = (await req.json()) as PromptEntry;
  const list = await getEntries();
  const next = list.map((item) => (item.id === body.id ? { ...body, updatedAt: new Date().toISOString() } : item));
  await saveEntries(next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const list = await getEntries();
  await saveEntries(list.filter((item) => item.id !== id));
  return NextResponse.json({ ok: true });
}

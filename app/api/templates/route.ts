import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getTemplates, saveTemplates } from "@/lib/storage";
import { PromptTemplate } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getTemplates());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<PromptTemplate>;
  const list = await getTemplates();
  const now = new Date().toISOString();
  const item: PromptTemplate = {
    id: uuid(),
    name: body.name ?? "未命名模板",
    tasks: body.tasks ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await saveTemplates([item, ...list]);
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const list = await getTemplates();
  await saveTemplates(list.filter((item) => item.id !== id));
  return NextResponse.json({ ok: true });
}

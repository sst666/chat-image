import { NextResponse } from "next/server";
import { generatePrompts } from "@/lib/ai";
import { appendLog, getSettings } from "@/lib/storage";
import { ProductInput, PromptTask } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = await getSettings();
    const product = body.product as ProductInput;
    const tasks = body.tasks as PromptTask[];
    const result = await generatePrompts(settings, product, tasks);
    await appendLog({
      type: "generation",
      message: "提示词生成完成",
      detail: `商品: ${product.title || "未命名"}，词条数量: ${tasks.length}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "提示词生成失败";
    await appendLog({ type: "error", message: "提示词生成失败", detail: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

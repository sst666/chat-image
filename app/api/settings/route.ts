import { NextResponse } from "next/server";
import { defaultSettings } from "@/lib/defaults";
import { getSettings, saveSettings } from "@/lib/storage";

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    console.error("[api/settings] GET failed:", error);
    return NextResponse.json(defaultSettings);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const next = {
      ...defaultSettings,
      ...body,
      baseUrl: defaultSettings.baseUrl,
      promptModel: defaultSettings.promptModel,
    };
    const saved = await saveSettings(next);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[api/settings] POST failed:", error);
    return NextResponse.json({ message: "保存设置失败，请检查 data 目录写权限" }, { status: 500 });
  }
}

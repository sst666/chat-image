import { NextResponse } from "next/server";
import { defaultSettings } from "@/lib/defaults";
import { normalizeClientSettings } from "@/lib/client-settings";

export async function GET() {
  return NextResponse.json({ ...defaultSettings, apiKey: "" });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "服务端设置保存已禁用，请在浏览器本地设置中保存",
    settings: normalizeClientSettings(defaultSettings),
  });
}

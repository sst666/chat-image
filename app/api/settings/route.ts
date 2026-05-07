import { NextResponse } from "next/server";
import { defaultSettings } from "@/lib/defaults";
import { getSettings, saveSettings } from "@/lib/storage";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(req: Request) {
  const body = await req.json();
  const next = {
    ...defaultSettings,
    ...body,
  };
  await saveSettings(next);
  return NextResponse.json(next);
}

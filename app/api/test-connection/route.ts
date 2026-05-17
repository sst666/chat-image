import { NextResponse } from "next/server";
import { normalizeClientSettings } from "@/lib/client-settings";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const settings = normalizeClientSettings(body?.settings);
  if (!settings.apiKey) return NextResponse.json({ ok: false, message: "API Key 为空" }, { status: 400 });
  const res = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.promptModel,
      messages: [{ role: "user", content: "reply ok" }],
      max_tokens: 5,
    }),
  });
  if (!res.ok) return NextResponse.json({ ok: false, message: await res.text() }, { status: 400 });
  return NextResponse.json({ ok: true, message: "连接成功" });
}

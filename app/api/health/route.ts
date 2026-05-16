import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "chat-image",
    timestamp: new Date().toISOString(),
  });
}

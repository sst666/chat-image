import { NextResponse } from "next/server";
import { getJobs, saveJobs } from "@/lib/storage";

export async function GET() {
  return NextResponse.json(await getJobs());
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const list = await getJobs();
  if (id) await saveJobs(list.filter((item) => item.id !== id));
  return NextResponse.json({ ok: true });
}

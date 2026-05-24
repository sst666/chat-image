import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { processJob } from "@/lib/server-job";
import { appendLog, getJob, getJobs, replaceJob, updateJob } from "@/lib/storage";
import { normalizeClientSettings } from "@/lib/client-settings";
import { clearRuntimeSettings, setRuntimeSettings } from "@/lib/runtime-settings";
import { GenerationJob, ProductInput, PromptTask } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const job = await getJob(id);
    if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    return NextResponse.json(job);
  }
  return NextResponse.json(await getJobs());
}

export async function POST(req: Request) {
  const body = await req.json();
  const product = body.product as ProductInput;
  const tasks = body.tasks as PromptTask[];
  const concurrency = Math.max(1, Math.min(2, Number(body.concurrency ?? 1)));
  const now = new Date().toISOString();
  const runtimeSettings = body?.settings ? normalizeClientSettings(body.settings) : null;
  const job: GenerationJob = {
    id: uuid(),
    title: product.title || "未命名任务",
    product,
    tasks,
    concurrency,
    settingsSnapshot: runtimeSettings ?? undefined,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    images: tasks.map((task) => ({
      id: uuid(),
      taskId: task.id,
      title: task.title,
      prompt: task.prompt,
      size: task.size,
      status: "queued",
      progress: 0,
    })),
  };
  await updateJob(job);
  if (runtimeSettings) {
    setRuntimeSettings(job.id, runtimeSettings);
  }
  await appendLog({
    type: "generation",
    message: "创建生成任务",
    detail: `任务ID: ${job.id}，商品: ${job.title}，图片数: ${tasks.length}`,
  });
  void processJob(job.id);
  return NextResponse.json(job);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const job = await getJob(body.jobId);
  if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (body?.settings) {
    const normalized = normalizeClientSettings(body.settings);
    setRuntimeSettings(job.id, normalized);
    job.settingsSnapshot = normalized;
  }
  let shouldReplace = false;
  if (body.action === "cancel-job") {
    job.status = "cancelled";
    clearRuntimeSettings(job.id);
  }
  if (body.action === "cancel-image") {
    const image = job.images.find((item) => item.id === body.imageId);
    if (image && !image.startedAt) {
      job.images = job.images.filter((item) => item.id !== body.imageId);
      shouldReplace = true;
    }
  }
  if (body.action === "regenerate-image") {
    const image = job.images.find((item) => item.id === body.imageId);
    if (image) {
      image.status = "queued";
      image.progress = 0;
      image.error = undefined;
      job.status = "running";
      void processJob(job.id);
    }
  }
  if (body.action === "add-tasks") {
    const tasks = body.tasks as PromptTask[];
    const product = body.product as ProductInput;
    job.product = product;
    job.concurrency = Math.max(1, Math.min(2, Number(body.concurrency ?? job.concurrency ?? 1)));
    job.completedAt = undefined;
    for (const task of tasks) {
      job.tasks.push(task);
      job.images.push({
        id: uuid(),
        taskId: task.id,
        title: task.title,
        prompt: task.prompt,
        size: task.size,
        status: "queued",
        progress: 0,
      });
    }
    job.status = "running";
    void processJob(job.id);
  }
  if (body.action === "pause-image") {
    const image = job.images.find((item) => item.id === body.imageId);
    if (image && image.status === "queued" && !image.startedAt) {
      image.status = "paused";
    }
  }
  if (body.action === "resume-image") {
    const image = job.images.find((item) => item.id === body.imageId);
    if (image && image.status === "paused") {
      image.status = "queued";
      job.status = "running";
      void processJob(job.id);
    }
  }
  if (body.action === "refresh-job") {
    const hasQueued = job.images.some((item) => item.status === "queued");
    if (hasQueued) {
      job.status = "running";
      void processJob(job.id);
    }
  }
  job.updatedAt = new Date().toISOString();
  if (shouldReplace) await replaceJob(job);
  else await updateJob(job);
  return NextResponse.json(job);
}

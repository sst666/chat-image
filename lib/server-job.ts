import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { generateImage } from "./ai";
import { resolveProjectRoot } from "./project-root";
import { appendLog, getJob, getSettings, toImageUrl, updateJob } from "./storage";
import { clearRuntimeSettings, getRuntimeSettings } from "./runtime-settings";
import { GenerationJob } from "./types";
const processing = new Set<string>();

async function writeImageFromUrl(url: string, filepath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载图片失败: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(filepath, buf);
}

async function writeImageFromBase64(b64: string, filepath: string) {
  const buf = Buffer.from(b64, "base64");
  await fs.writeFile(filepath, buf);
}

export async function processJob(jobId: string) {
  if (processing.has(jobId)) return;
  processing.add(jobId);
  try {
  const job = await getJob(jobId);
  if (!job || (job.status !== "queued" && job.status !== "running")) return;

  const settings = await getSettings();
  const runtimeSettings = getRuntimeSettings(jobId);
  const effectiveSettings = runtimeSettings ?? job.settingsSnapshot ?? settings;
  job.status = "running";
  job.updatedAt = new Date().toISOString();
  await updateJob(job);

  const worker = async () => {
    while (true) {
      const latest = await getJob(jobId);
      if (!latest || latest.status === "cancelled") {
        clearRuntimeSettings(jobId);
        return;
      }
      const image = latest.images.find((i) => i.status === "queued");
      if (!image) return;
      image.status = "running";
      image.progress = 10;
      image.startedAt = new Date().toISOString();
      latest.updatedAt = new Date().toISOString();
      await updateJob(latest);

      try {
        const task = latest.tasks.find((t) => t.id === image.taskId);
        if (!task) throw new Error("任务不存在");
        const runtimeLatest = getRuntimeSettings(jobId);
        const modelSettings = runtimeLatest ?? latest.settingsSnapshot ?? effectiveSettings;
        const outDir = path.join(resolveProjectRoot(), "public", "outputs", latest.id);
        await fs.mkdir(outDir, { recursive: true });
        const filename = `${task.type}-${task.id}-${uuid()}.png`;
        const filepath = path.join(outDir, filename);
        const generated = await generateImage(modelSettings, task, latest.product);
        image.progress = 70;
        latest.updatedAt = new Date().toISOString();
        await updateJob(latest);
        if (generated.url) await writeImageFromUrl(generated.url, filepath);
        if (generated.b64) await writeImageFromBase64(generated.b64, filepath);
        image.outputPath = filepath;
        image.outputUrl = toImageUrl(filepath);
        image.progress = 100;
        image.status = "completed";
        image.completedAt = new Date().toISOString();
      } catch (error) {
        image.status = "failed";
        image.error = error instanceof Error ? error.message : "未知错误";
        await appendLog({
          type: "error",
          message: "单张图片生成失败",
          detail: `任务ID: ${latest.id}，词条: ${image.title}，原因: ${image.error}`,
        });
      }
      latest.updatedAt = new Date().toISOString();
      await updateJob(latest);
    }
  };

  const workerCount = Math.max(1, Math.min(2, job.concurrency ?? 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const finalJob = (await getJob(jobId)) as GenerationJob;
  if (!finalJob) return;
  const allDone = finalJob.images.every((img) => ["completed", "failed", "cancelled"].includes(img.status));
  if (allDone) {
    finalJob.status = finalJob.images.some((img) => img.status === "completed") ? "completed" : "failed";
    finalJob.completedAt = new Date().toISOString();
    finalJob.updatedAt = new Date().toISOString();
    await updateJob(finalJob);
    await appendLog({
      type: "generation",
      message: "任务完成",
      detail: `任务ID: ${finalJob.id}，状态: ${finalJob.status}`,
    });
    clearRuntimeSettings(jobId);
  }
  } finally {
    processing.delete(jobId);
  }
}

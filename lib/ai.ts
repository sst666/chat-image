import { AppSettings, ProductInput, PromptTask, UploadedImage } from "./types";
import { promises as fs } from "fs";
import path from "path";
import { resolveProjectRoot } from "./project-root";

function fidelityInstruction(fidelity: ProductInput["fidelity"]) {
  if (fidelity === "high") return "商品保真度最高，必须严格保留商品颜色、版型、轮廓、材质和纹理，不改动核心设计。";
  if (fidelity === "medium") return "商品保真度中等，允许优化场景和光影，但商品核心形态和卖点必须保持一致。";
  return "商品保真度较低，允许更强创意演绎，但仍需让消费者识别为同一商品。";
}

export async function generatePrompts(settings: AppSettings, product: ProductInput, tasks: PromptTask[]) {
  if (!settings.apiKey) {
    return tasks.map((task) => ({
      ...task,
      prompt: `${task.prompt}\n\n商品：${product.title || "未命名商品"}。需求：${product.customRequirement || "无"}。处理要求：${product.requirements.join("、") || "无"}。${fidelityInstruction(product.fidelity)}`,
    }));
  }

  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.promptModel,
      messages: [
        {
          role: "system",
          content: "你是资深淘宝电商视觉提示词策划。只输出 JSON 数组，每项包含 id 和 prompt。提示词必须具体、可用于图像生成、中文表达。",
        },
        {
          role: "user",
          content: JSON.stringify({
            productTitle: product.title,
            customRequirement: product.customRequirement,
            requirements: product.requirements,
            fidelity: fidelityInstruction(product.fidelity),
            uploadedImageTypes: product.uploads.map((item) => item.kind),
            tasks: tasks.map(({ id, title, type, size, prompt }) => ({ id, title, type, size, themePrompt: prompt })),
            consistencyRule: product.requirements.includes("模特换人")
              ? "第一次生成可进行模特换人，用户确认后后续提示词不再写模特换人，以确认后的图作为参考保持人物一致。"
              : "不要主动更换模特身份，保持参考图人物和商品一致性。",
          }),
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`提示词生成失败：${response.status} ${await response.text()}`);
  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content ?? "[]";
  const parsed = JSON.parse(text.replace(/^```json|```$/g, "").trim()) as Array<{ id: string; prompt: string }>;
  return tasks.map((task) => ({ ...task, prompt: parsed.find((item) => item.id === task.id)?.prompt || task.prompt }));
}

function pickReference(uploaded: UploadedImage[], task: PromptTask) {
  if (task.referenceImageId) {
    const selected = uploaded.find((image) => image.id === task.referenceImageId);
    if (selected) return selected;
  }
  if (task.referenceKind) return uploaded.find((image) => image.kind === task.referenceKind) ?? uploaded[0];
  if (task.title.includes("细节")) return uploaded.find((image) => image.kind === "side") ?? uploaded[0];
  if (task.title.includes("生活") || task.title.includes("场景")) return uploaded.find((image) => image.kind === "lifestyle") ?? uploaded[0];
  if (task.prompt.includes("模特")) return uploaded.find((image) => image.kind === "model") ?? uploaded[0];
  return uploaded.find((image) => image.kind === "front") ?? uploaded[0];
}

async function toDataUrl(reference?: UploadedImage | null) {
  if (!reference) return null;
  if (reference.url.startsWith("http")) return reference.url;
  const rawUrl = String(reference.url || "");
  const uploadRelative =
    rawUrl.startsWith("/api/uploads/") ? rawUrl.slice("/api/uploads/".length) :
    rawUrl.startsWith("/uploads/") ? rawUrl.slice("/uploads/".length) :
    rawUrl.replace(/^\//, "");
  const localPath = path.join(resolveProjectRoot(), "public", "uploads", decodeURIComponent(uploadRelative));
  const buf = await fs.readFile(localPath);
  return `data:${reference.mimeType || "image/png"};base64,${buf.toString("base64")}`;
}

async function resolveReferenceImages(task: PromptTask, uploaded: UploadedImage[]) {
  if (!uploaded.length) return [] as string[];
  const selected = task.entryId === "custom-image"
    ? uploaded
    : [pickReference(uploaded, task)].filter(Boolean) as UploadedImage[];
  const refs = await Promise.all(selected.map((item) => toDataUrl(item)));
  return refs.filter(Boolean) as string[];
}

function dataUrlToBuffer(input: string) {
  const raw = String(input || "").trim();
  const matched = raw.match(/^data:([^;,]+);base64,(.+)$/i);
  if (matched) {
    return {
      mimeType: matched[1] || "image/png",
      bytes: Buffer.from(matched[2] || "", "base64"),
    };
  }
  return {
    mimeType: "image/png",
    bytes: Buffer.from(raw, "base64"),
  };
}

function extByMime(mimeType: string) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  return "png";
}

function buildImagePrompt(task: PromptTask, product: ProductInput, adaptiveHint: string) {
  return `${task.prompt}${adaptiveHint}\n\n商品标题：${product.title}\n自定义需求：${product.customRequirement || "无"}\n商品保真：${fidelityInstruction(product.fidelity)}\n参考图要求：严格遵循参考图中的商品款式、颜色、纹理、logo与关键结构，不可偏离原商品特征。`;
}

async function requestImageGeneration(endpoint: string, apiKey: string, model: string, normalizedSize: string, prompt: string, references: string[], useMultipart: boolean) {
  return useMultipart
    ? await (async () => {
        const form = new FormData();
        form.append("model", model);
        form.append("prompt", prompt);
        form.append("size", normalizedSize);
        form.append("n", "1");
        form.append("response_format", "b64_json");
        for (let index = 0; index < references.length; index += 1) {
          const payload = dataUrlToBuffer(references[index]);
          if (!payload.bytes.length) continue;
          const blob = new Blob([payload.bytes], { type: payload.mimeType });
          form.append("image[]", blob, `reference-${index + 1}.${extByMime(payload.mimeType)}`);
        }
        return fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
      })()
    : await (async () => {
        const body: Record<string, unknown> = {
          model,
          prompt,
          size: normalizedSize,
          n: 1,
        };
        if (references[0]) body.image = references[0];
        return fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });
      })();
}

export async function generateImage(settings: AppSettings, task: PromptTask, product: ProductInput) {
  const references = await resolveReferenceImages(task, product.uploads);
  const normalizedSize = task.size === "800xauto" ? "800x1200" : task.size;
  const adaptiveHint = task.size === "800xauto" ? "\n构图要求：宽度800，高度自适应，优先保证主体完整和信息清晰。" : "";
  const prompt = buildImagePrompt(task, product, adaptiveHint);
  const endpoint = `${settings.baseUrl.replace(/\/$/, "")}/v1/images/generations`;
  const useMultipart = references.length > 1 || task.entryId === "custom-image";
  const modelQueue = [settings.imageModel, ...(settings.backupImageModels || [])]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
  const failures: string[] = [];

  for (const model of modelQueue) {
    const response = await requestImageGeneration(endpoint, settings.apiKey, model, normalizedSize, prompt, references, useMultipart);
    if (!response.ok) {
      failures.push(`${model}: ${response.status} ${await response.text()}`);
      continue;
    }
    const payload = await response.json();
    const item = payload.data?.[0];
    if (item?.url) return { url: item.url as string, model };
    if (item?.b64_json) return { b64: item.b64_json as string, model };
    failures.push(`${model}: 图片生成接口未返回 url 或 b64_json`);
  }

  throw new Error(`图片生成失败：${failures.join("；")}`);
}

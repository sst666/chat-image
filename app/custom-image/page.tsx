"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FolderDown, ImagePlus, Images, Plus, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createId } from "@/lib/id";
import { readClientSettings } from "@/lib/client-settings";
import { PromptTask, UploadedImage, UploadKind } from "@/lib/types";

type UploadSlot = "product" | "reference";
type AspectRatioValue = "auto" | "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9" | "custom";
type Fidelity = "high" | "medium" | "low";

type CustomImageWorkbench = {
  id: string;
  name: string;
  title: string;
  aspectRatio: AspectRatioValue;
  customWidth: number;
  customHeight: number;
  fidelity: Fidelity;
  processRequirementId: string;
  defaultPrompt: string;
  customRequirement: string;
  productUploads: UploadedImage[];
  referenceUploads: UploadedImage[];
  jobId: string;
};

type CustomImagePersistState = {
  workbenches: CustomImageWorkbench[];
  activeWorkbenchId: string;
};

const aspectRatioOptions: Array<{ value: AspectRatioValue; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "1:1", label: "1:1" },
  { value: "2:3", label: "2:3" },
  { value: "3:2", label: "3:2" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "4:5", label: "4:5" },
  { value: "5:4", label: "5:4" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "21:9", label: "21:9" },
  { value: "custom", label: "自定义" },
];

const processRequirementOptions = [
  {
    id: "custom-style",
    label: "自定义生图",
    description: "产品图为主，参照参考图生成相似风格图",
    defaultPrompt:
      "请以产品图为核心，参考模板图的视觉风格和构图关系，生成相似风格的新图，确保商品特征与颜色一致。",
  },
  {
    id: "main-image",
    label: "生成主图",
    description: "以产品图为主，参照参考图模板生成电商主图",
    defaultPrompt:
      "请以产品图为核心主体，参考模板图的构图与质感，生成淘宝主图。主体完整、画面干净、信息聚焦，突出商品卖点并保持真实材质细节。",
  },
  {
    id: "model-image",
    label: "模特生图",
    description: "模特以参考图为主，商品细节以产品图为准",
    defaultPrompt:
      "请以参考图中的模特姿态、场景氛围为模板，保持产品图的版型、颜色、纹理和关键细节不变，生成自然真实的模特展示图。",
  },
  {
    id: "size-image",
    label: "生成尺码图",
    description: "生成清晰易读的尺码展示图",
    defaultPrompt:
      "请生成电商尺码说明图，画面整洁、信息分层清晰，重点突出尺码数据和版型说明，保持商品与产品图一致。",
  },
  {
    id: "campaign-image",
    label: "生成活动图",
    description: "用于促销活动与营销展示",
    defaultPrompt:
      "请生成活动营销图，突出优惠氛围和购买动机，商品主体清晰，文案留白合理，整体风格与参考图调性一致。",
  },
] as const;

const defaultProcessRequirement = processRequirementOptions[0];
const stateKey = "tb-ai-custom-image-v2:guest";

function formatTaskNameByNow() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function getProcessRequirementById(id?: string) {
  return processRequirementOptions.find((option) => option.id === id) || defaultProcessRequirement;
}

function clampDimension(value: number) {
  if (!Number.isFinite(value)) return 1024;
  return Math.max(64, Math.min(4096, Math.round(value)));
}

function createEmptyWorkbench(): CustomImageWorkbench {
  return {
    id: createId(),
    name: formatTaskNameByNow(),
    title: "",
    aspectRatio: "auto",
    customWidth: 1200,
    customHeight: 1200,
    fidelity: "high",
    processRequirementId: defaultProcessRequirement.id,
    defaultPrompt: defaultProcessRequirement.defaultPrompt,
    customRequirement: "",
    productUploads: [],
    referenceUploads: [],
    jobId: "",
  };
}

function readCustomImageState(): CustomImagePersistState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(stateKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomImagePersistState>;
    const workbenches = Array.isArray(parsed.workbenches) ? parsed.workbenches : [];
    if (!workbenches.length) return null;
    return {
      workbenches: workbenches.map((item) => {
        const option = getProcessRequirementById(String(item.processRequirementId || ""));
        return {
          id: String(item.id || createId()),
          name: String(item.name || formatTaskNameByNow()),
          title: String(item.title || ""),
          aspectRatio: aspectRatioOptions.some((ratio) => ratio.value === item.aspectRatio)
            ? (item.aspectRatio as AspectRatioValue)
            : "auto",
          customWidth: clampDimension(Number(item.customWidth || 1200)),
          customHeight: clampDimension(Number(item.customHeight || 1200)),
          fidelity: item.fidelity === "low" || item.fidelity === "medium" ? item.fidelity : "high",
          processRequirementId: option.id,
          defaultPrompt: String(item.defaultPrompt || option.defaultPrompt),
          customRequirement: String(item.customRequirement || ""),
          productUploads: Array.isArray(item.productUploads) ? item.productUploads : [],
          referenceUploads: Array.isArray(item.referenceUploads) ? item.referenceUploads : [],
          jobId: String(item.jobId || ""),
        };
      }),
      activeWorkbenchId: String(parsed.activeWorkbenchId || workbenches[0]?.id || ""),
    };
  } catch {
    return null;
  }
}

function writeCustomImageState(state: CustomImagePersistState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function parseRatioPair(ratio: string) {
  const [wRaw, hRaw] = ratio.split(":");
  const w = Number(wRaw);
  const h = Number(hRaw);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

function resolveSizeByAspectRatio(ratio: AspectRatioValue, customWidth: number, customHeight: number) {
  if (ratio === "auto") return { size: "800xauto", width: 800, height: 1200 };
  if (ratio === "custom") {
    const width = clampDimension(customWidth);
    const height = clampDimension(customHeight);
    return { size: `${width}x${height}`, width, height };
  }
  const parsed = parseRatioPair(ratio);
  if (!parsed) return { size: "800x800", width: 800, height: 800 };
  if (parsed.w >= parsed.h) {
    const width = 800;
    const height = Math.max(64, Math.round((parsed.h / parsed.w) * 800));
    return { size: `${width}x${height}`, width, height };
  }
  const height = 800;
  const width = Math.max(64, Math.round((parsed.w / parsed.h) * 800));
  return { size: `${width}x${height}`, width, height };
}

function normalizeUploadUrl(image?: Pick<UploadedImage, "url" | "filename"> | null) {
  if (!image) return "";
  if (image.url) {
    const raw = String(image.url);
    if (raw.startsWith("/api/uploads/")) return raw;
    if (raw.startsWith("/uploads/")) {
      const filename = raw.slice("/uploads/".length);
      return `/api/uploads/${filename}`;
    }
    return raw;
  }
  if (image.filename) return `/api/uploads/${encodeURIComponent(String(image.filename))}`;
  return "";
}

function inferImageExt(url: string) {
  const pure = String(url || "").split("?")[0].toLowerCase();
  if (pure.endsWith(".jpg") || pure.endsWith(".jpeg")) return "jpg";
  if (pure.endsWith(".webp")) return "webp";
  if (pure.endsWith(".gif")) return "gif";
  return "png";
}

function normalizeDownloadFilename(input: string) {
  return (
    String(input || "image")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || "image"
  );
}

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function statusTone(status?: string) {
  switch (status) {
    case "completed":
      return "app-status-success";
    case "failed":
    case "cancelled":
      return "app-status-danger";
    default:
      return "app-muted";
  }
}

export default function CustomImagePage() {
  const router = useRouter();
  const [workbenches, setWorkbenches] = useState<CustomImageWorkbench[]>([]);
  const [activeWorkbenchId, setActiveWorkbenchId] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<UploadSlot | "">("");
  const [pastingSlot, setPastingSlot] = useState<UploadSlot | "">("");
  const [job, setJob] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadingImageId, setDownloadingImageId] = useState("");

  const active = useMemo(
    () => workbenches.find((item) => item.id === activeWorkbenchId) ?? null,
    [activeWorkbenchId, workbenches]
  );

  const selectedProcessRequirement = useMemo(
    () => getProcessRequirementById(active?.processRequirementId),
    [active?.processRequirementId]
  );

  const productUploads = useMemo(
    () => ((active?.productUploads || []).filter(Boolean) as UploadedImage[]),
    [active?.productUploads]
  );
  const referenceUploads = useMemo(
    () => ((active?.referenceUploads || []).filter(Boolean) as UploadedImage[]),
    [active?.referenceUploads]
  );
  const mergedUploads = useMemo(() => {
    const map = new Map<string, UploadedImage>();
    [...productUploads, ...referenceUploads].forEach((item) => {
      if (!item?.id || map.has(item.id)) return;
      map.set(item.id, item);
    });
    return Array.from(map.values());
  }, [productUploads, referenceUploads]);

  const resolvedSize = useMemo(
    () => resolveSizeByAspectRatio(active?.aspectRatio || "auto", active?.customWidth || 1200, active?.customHeight || 1200),
    [active?.aspectRatio, active?.customHeight, active?.customWidth]
  );

  useEffect(() => {
    const saved = readCustomImageState();
    if (saved?.workbenches.length) {
      setWorkbenches(saved.workbenches);
      setActiveWorkbenchId(saved.activeWorkbenchId || saved.workbenches[0].id);
      return;
    }
    const first = createEmptyWorkbench();
    setWorkbenches([first]);
    setActiveWorkbenchId(first.id);
  }, []);

  useEffect(() => {
    if (!workbenches.length) return;
    writeCustomImageState({
      workbenches,
      activeWorkbenchId: activeWorkbenchId || workbenches[0].id,
    });
  }, [activeWorkbenchId, workbenches]);

  useEffect(() => {
    if (!active?.jobId) {
      setJob(null);
      return;
    }
    let alive = true;
    const pull = async () => {
      const data = await fetch(`/api/jobs?id=${active.jobId}`).then((r) => r.json()).catch(() => null);
      if (!alive || !data?.id) return;
      setJob(data);
      const failed = Array.isArray(data.images) ? data.images.find((item: any) => item.status === "failed" && item.error) : null;
      if (failed?.error) setStatusMsg(`生成失败：${failed.error}`);
    };
    void pull();
    const timer = setInterval(pull, 1200);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active?.jobId]);

  const patchActive = (patch: Partial<CustomImageWorkbench>) => {
    if (!active) return;
    setWorkbenches((prev) => prev.map((item) => (item.id === active.id ? { ...item, ...patch } : item)));
  };

  const patchSlotUploads = (slot: UploadSlot, nextUploads: UploadedImage[]) => {
    patchActive(slot === "product" ? { productUploads: nextUploads } : { referenceUploads: nextUploads });
  };

  const appendUploads = async (slot: UploadSlot, files: FileList | File[] | null) => {
    if (!active) return;
    const list = Array.isArray(files) ? files : files ? Array.from(files) : [];
    if (!list.length) return;
    setUploadingSlot(slot);
    const current = slot === "product" ? productUploads : referenceUploads;
    const kind: UploadKind = slot === "product" ? "front" : "other";
    try {
      const added: UploadedImage[] = [];
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "上传失败");
        added.push(data as UploadedImage);
      }
      patchSlotUploads(slot, [...current, ...added]);
      setStatusMsg(`${slot === "product" ? "产品图" : "参考图"}已上传 ${added.length} 张`);
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploadingSlot("");
    }
  };

  const pasteUploads = async (slot: UploadSlot, event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items || [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    if (!files.length) return;
    event.preventDefault();
    if (pastingSlot) return;
    setPastingSlot(slot);
    try {
      await appendUploads(slot, files);
    } finally {
      setPastingSlot("");
    }
  };

  const removeUpload = (slot: UploadSlot, uploadId: string) => {
    const current = slot === "product" ? productUploads : referenceUploads;
    patchSlotUploads(slot, current.filter((item) => item.id !== uploadId));
  };

  const createWorkbench = () => {
    const next = createEmptyWorkbench();
    setWorkbenches((prev) => [...prev, next]);
    setActiveWorkbenchId(next.id);
  };

  const deleteWorkbench = async (workbenchId: string) => {
    if (!confirm("确定删除这个自定义任务吗？")) return;
    const target = workbenches.find((item) => item.id === workbenchId);
    if (!target) return;
    if (target.jobId) {
      try {
        await fetch("/api/jobs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel-job", jobId: target.jobId }),
        });
      } catch {}
    }
    const next = workbenches.filter((item) => item.id !== workbenchId);
    if (!next.length) {
      const first = createEmptyWorkbench();
      setWorkbenches([first]);
      setActiveWorkbenchId(first.id);
      return;
    }
    setWorkbenches(next);
    if (activeWorkbenchId === workbenchId) setActiveWorkbenchId(next[0].id);
  };

  const onChangeProcessRequirement = (id: string) => {
    const option = getProcessRequirementById(id);
    patchActive({
      processRequirementId: option.id,
      defaultPrompt: option.defaultPrompt,
    });
  };

  const generate = async () => {
    if (!active) return;
    const defaultPrompt = active.defaultPrompt.trim();
    const customPrompt = active.customRequirement.trim();
    if (!defaultPrompt && !customPrompt) {
      setStatusMsg("请至少填写默认提示词或自定义要求");
      return;
    }
    if (!mergedUploads.length) {
      setStatusMsg("请至少上传一张产品图或参考图");
      return;
    }
    if (active.aspectRatio === "custom" && (!active.customWidth || !active.customHeight)) {
      setStatusMsg("请输入完整的自定义尺寸像素值");
      return;
    }
    const task: PromptTask = {
      id: createId(),
      entryId: "custom-image",
      type: resolvedSize.height > resolvedSize.width ? "detail" : "main",
      title: selectedProcessRequirement.label,
      size: resolvedSize.size,
      prompt: [defaultPrompt, customPrompt].filter(Boolean).join("\n"),
      enabled: true,
    };
    setSubmitting(true);
    setStatusMsg("任务创建中...");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            title: active.title.trim() || "自定义生图任务",
            customRequirement: customPrompt,
            requirements: [`${selectedProcessRequirement.label}：${selectedProcessRequirement.description}`],
            fidelity: active.fidelity,
            uploads: mergedUploads,
          },
          tasks: [task],
          concurrency: 1,
          settings: readClientSettings(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建任务失败");
      patchActive({
        jobId: data.id,
        name: active.title.trim() || active.name,
        customWidth: resolvedSize.width,
        customHeight: resolvedSize.height,
      });
      setJob(data);
      setStatusMsg("任务已创建，正在生成");
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "创建任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadImage = (item: any, index: number) => {
    if (!item?.outputUrl) return;
    const ext = inferImageExt(item.outputUrl);
    const filename = `${normalizeDownloadFilename(active?.name || "custom")}-${String(index + 1).padStart(2, "0")}-${normalizeDownloadFilename(item.title || `image-${index + 1}`)}.${ext}`;
    triggerBrowserDownload(item.outputUrl, filename);
  };

  const downloadToSelectedFolder = async (item: any, index: number) => {
    if (!item?.outputUrl) return;
    const picker = (window as any).showDirectoryPicker as undefined | (() => Promise<any>);
    if (!picker) {
      downloadImage(item, index);
      setStatusMsg("当前浏览器不支持选择文件夹，已使用普通下载。");
      return;
    }
    const ext = inferImageExt(item.outputUrl);
    const filename = `${normalizeDownloadFilename(active?.name || "custom")}-${String(index + 1).padStart(2, "0")}-${normalizeDownloadFilename(item.title || `image-${index + 1}`)}.${ext}`;
    setDownloadingImageId(String(item.id || ""));
    try {
      const dirHandle = await picker();
      const res = await fetch(String(item.outputUrl));
      if (!res.ok) throw new Error(`下载失败：${res.status}`);
      const blob = await res.blob();
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      setStatusMsg(`已保存到所选文件夹：${filename}`);
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "保存失败");
    } finally {
      setDownloadingImageId("");
    }
  };

  const renderUploadBox = (slot: UploadSlot, title: string, uploads: UploadedImage[]) => {
    const isUploading = uploadingSlot === slot;
    const isPasting = pastingSlot === slot;
    return (
      <div className="app-card-soft rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {slot === "product" ? <ImagePlus size={16} /> : <Images size={16} />}
            <span>{title}</span>
          </div>
          <label className="app-button-secondary cursor-pointer px-3 py-2 text-xs">
            <Plus size={14} />
            {isUploading ? "上传中..." : "上传图片"}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void appendUploads(slot, event.target.files)}
            />
          </label>
        </div>
        <textarea
          className="app-textarea h-16 text-xs"
          placeholder={isPasting ? "粘贴上传中..." : "支持直接粘贴截图到这里（Ctrl/Cmd + V）"}
          onPaste={(event) => void pasteUploads(slot, event)}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {uploads.map((image, index) => (
            <div key={image.id} className="app-card rounded-2xl p-2">
              <img
                src={normalizeUploadUrl(image)}
                alt={`${title}${index + 1}`}
                className="h-24 w-full rounded-xl object-cover"
              />
              <div className="mt-2 truncate text-[11px] font-medium">{image.originalName || `${title}${index + 1}`}</div>
              <button className="app-button-danger mt-2 w-full px-3 py-2 text-xs" onClick={() => removeUpload(slot, image.id)}>
                <Trash2 size={14} />
                删除
              </button>
            </div>
          ))}
          {!uploads.length ? (
            <div className="app-card-soft col-span-full rounded-2xl border-dashed px-4 py-8 text-center text-xs app-muted">
              暂无图片，先上传或粘贴素材。
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (!active) return <section className="panel rounded-3xl p-6 text-sm app-muted">加载中...</section>;

  return (
    <section className="grid gap-5 xl:grid-cols-[280px,minmax(0,1fr),420px]">
      <aside className="app-card rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">任务工作台</div>
            <div className="app-muted mt-1 text-xs">在这里切换不同的自定义生图任务。</div>
          </div>
          <button className="app-icon-button" onClick={createWorkbench} title="新建任务" aria-label="新建任务">
            <Plus size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="app-badge">{workbenches.length} 个任务</span>
          <span className="app-badge">{mergedUploads.length} 张素材</span>
        </div>

        <div className="space-y-3">
          {workbenches.map((item) => (
            <div
              key={item.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                item.id === active.id
                  ? "border-transparent bg-[color:var(--accent-soft)] shadow-[var(--shadow-soft)]"
                  : "border-[color:var(--line)] bg-[color:var(--panel-muted)]"
              }`}
              onClick={() => setActiveWorkbenchId(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setActiveWorkbenchId(item.id);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.title || item.name}</div>
                  <div className="mt-1 truncate text-xs app-muted">{getProcessRequirementById(item.processRequirementId).label}</div>
                </div>
                <span className="app-badge text-[11px]">{item.aspectRatio === "custom" ? "自定义像素" : item.aspectRatio}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className={`text-xs ${item.id === active.id ? statusTone(job?.status) : "app-muted"}`}>
                  {item.id === active.id ? (job?.status || "未开始") : item.jobId ? "已有任务" : "未提交"}
                </div>
                <button
                  type="button"
                  className="app-button-danger px-3 py-2 text-[11px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteWorkbench(item.id);
                  }}
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        <section className="app-card rounded-3xl p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} />
                自定义生图
              </div>
              {active.title ? <h1 className="text-3xl font-semibold tracking-tight">{active.title}</h1> : null}
              <p className="app-muted mt-2 max-w-2xl text-sm">
                用产品图和参考图快速拼出一套更细的生图流程。现在支持固定比例、自动高宽，以及手动输入像素尺寸。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="app-badge">
                <WandSparkles size={14} />
                {selectedProcessRequirement.label}
              </span>
              <span className="app-badge">{resolvedSize.width} x {resolvedSize.height}px</span>
              <button className="app-button-secondary px-4 py-3 text-sm" onClick={() => router.push("/")}>
                返回聊天
              </button>
            </div>
          </div>
        </section>

        <section className="app-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">素材区</div>
              <div className="app-muted mt-1 text-sm">左放产品图，右放参考图。两边都支持多图和截图粘贴。</div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {renderUploadBox("product", "产品图", productUploads)}
            {renderUploadBox("reference", "参考图", referenceUploads)}
          </div>
        </section>

        <section className="app-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">生成参数</div>
              <div className="app-muted mt-1 text-sm">先定需求，再定尺寸和保真度，最后提交生成。</div>
            </div>
            <span className="app-badge">最终输出 {resolvedSize.size}</span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="app-muted">任务标题</span>
              <input
                className="app-input"
                placeholder="不填则使用默认任务名"
                value={active.title}
                onChange={(event) => patchActive({ title: event.target.value })}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="app-muted">处理需求</span>
              <select
                className="app-select"
                value={active.processRequirementId}
                onChange={(event) => onChangeProcessRequirement(event.target.value)}
              >
                {processRequirementOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.label} - ${option.description}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm xl:col-span-2">
              <span className="app-muted">默认提示词</span>
              <textarea
                className="app-textarea h-24"
                placeholder={selectedProcessRequirement.defaultPrompt}
                value={active.defaultPrompt}
                onChange={(event) => patchActive({ defaultPrompt: event.target.value })}
              />
            </label>

            <label className="grid gap-2 text-sm xl:col-span-2">
              <span className="app-muted">自定义要求</span>
              <textarea
                className="app-textarea h-28"
                placeholder="可追加更细的风格、场景、质感、文案留白等要求。"
                value={active.customRequirement}
                onChange={(event) => patchActive({ customRequirement: event.target.value })}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="app-muted">商品保真度</span>
              <select
                className="app-select"
                value={active.fidelity}
                onChange={(event) => patchActive({ fidelity: event.target.value as Fidelity })}
              >
                <option value="high">高保真</option>
                <option value="medium">中保真</option>
                <option value="low">低保真</option>
              </select>
            </label>

            <div className="grid gap-2 text-sm">
              <span className="app-muted">尺寸比例</span>
              <div className="grid grid-cols-4 gap-2">
                {aspectRatioOptions.map((option) => {
                  const selected = active.aspectRatio === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-2xl border px-2 py-2 text-xs transition ${
                        selected
                          ? "border-transparent bg-[color:var(--accent-soft)] text-[color:var(--text)]"
                          : "border-[color:var(--line)] bg-[color:var(--panel-muted)] app-muted"
                      }`}
                      onClick={() => patchActive({ aspectRatio: option.value })}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {active.aspectRatio === "custom" ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-muted)] p-4 xl:col-span-2">
                <div className="text-sm font-semibold">自定义尺寸像素</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="app-muted">宽度（px）</span>
                    <input
                      className="app-input"
                      type="number"
                      min={64}
                      max={4096}
                      value={active.customWidth}
                      onChange={(event) => patchActive({ customWidth: Number(event.target.value || 0) })}
                      onBlur={(event) => patchActive({ customWidth: clampDimension(Number(event.target.value || 0)) })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="app-muted">高度（px）</span>
                    <input
                      className="app-input"
                      type="number"
                      min={64}
                      max={4096}
                      value={active.customHeight}
                      onChange={(event) => patchActive({ customHeight: Number(event.target.value || 0) })}
                      onBlur={(event) => patchActive({ customHeight: clampDimension(Number(event.target.value || 0)) })}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={`text-sm ${statusMsg ? "app-status-success" : "app-muted"}`}>
              {statusMsg || "准备完成后即可提交生成。"}
            </div>
            <button className="app-button-primary px-5 py-3 text-sm" disabled={submitting} onClick={generate}>
              <Sparkles size={16} />
              {submitting ? "提交中..." : "生成图片"}
            </button>
          </div>
        </section>
      </div>

      <aside className="app-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">结果预览</div>
            <div className="app-muted mt-1 text-sm">状态、预览和下载都放在这里。</div>
          </div>
          <span className={`text-sm font-medium ${statusTone(job?.status)}`}>{job?.status || "未开始"}</span>
        </div>

        <div className="mb-4 grid gap-2">
          <div className="app-card-soft rounded-2xl p-4">
            <div className="app-muted text-xs">当前任务</div>
            <div className="mt-1 text-sm font-semibold">{active.title || active.name}</div>
          </div>
          <div className="app-card-soft rounded-2xl p-4">
            <div className="app-muted text-xs">输出尺寸</div>
            <div className="mt-1 text-sm font-semibold">{resolvedSize.width} x {resolvedSize.height}px</div>
          </div>
        </div>

        <div className="space-y-3">
          {(job?.images || []).map((item: any, index: number) => (
            <div key={item.id} className="app-card-soft rounded-2xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className={`mt-1 text-xs ${statusTone(item.status)}`}>{item.status} {item.progress}%</div>
                </div>
                <span className="app-badge text-[11px]">{item.size || resolvedSize.size}</span>
              </div>
              {item.outputUrl ? (
                <img
                  src={item.outputUrl}
                  alt={item.title}
                  className="mt-3 aspect-square w-full cursor-zoom-in rounded-2xl object-cover"
                  onClick={() => setPreviewUrl(item.outputUrl)}
                />
              ) : (
                <div className="app-card mt-3 flex aspect-square items-center justify-center rounded-2xl text-sm app-muted">
                  等待生成结果
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="app-button-secondary px-3 py-3 text-xs" onClick={() => downloadImage(item, index)} disabled={!item.outputUrl}>
                  <Download size={14} />
                  下载
                </button>
                <button
                  className="app-button-primary px-3 py-3 text-xs"
                  onClick={() => void downloadToSelectedFolder(item, index)}
                  disabled={!item.outputUrl || downloadingImageId === String(item.id || "")}
                >
                  <FolderDown size={14} />
                  {downloadingImageId === String(item.id || "") ? "保存中..." : "存到文件夹"}
                </button>
              </div>
              {item.error ? <div className="mt-2 text-xs app-status-danger">{item.error}</div> : null}
            </div>
          ))}
          {!job?.images?.length ? (
            <div className="app-card-soft rounded-2xl px-4 py-10 text-center text-sm app-muted">
              提交任务后，这里会显示生成中的状态和最终图片。
            </div>
          ) : null}
        </div>
      </aside>

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setPreviewUrl("")}>
          <img src={previewUrl} alt="预览图" className="max-h-full max-w-full rounded-3xl shadow-2xl" />
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { defaultEntries, requirementLabels } from "@/lib/defaults";
import { readClientSettings } from "@/lib/client-settings";
import { PromptEntry, PromptTask, UploadedImage, UploadKind } from "@/lib/types";
import { buildTasks, readWorkbenchState, WorkbenchTask, writeWorkbenchState } from "@/lib/workbench-store";
import { createId } from "@/lib/id";

type Tab = "prompts" | "results";

const uploadKinds: Array<{ kind: UploadKind; label: string }> = [
  { kind: "front", label: "产品正面图" },
  { kind: "back", label: "产品背面图" },
  { kind: "white-bg", label: "白底实物图" },
  { kind: "model", label: "模特图" },
  { kind: "side", label: "侧面图" },
  { kind: "lifestyle", label: "实拍图" },
  { kind: "gift", label: "赠品图" },
  { kind: "other", label: "其它图" },
];

function pickKindByTask(task: PromptTask): UploadKind {
  if (task.prompt.includes("模特") || task.title.includes("模特")) return "model";
  if (task.title.includes("白底")) return "white-bg";
  if (task.title.includes("细节")) return "side";
  if (task.title.includes("场景") || task.title.includes("生活")) return "lifestyle";
  return "front";
}

function pickReferenceId(task: PromptTask, uploads: UploadedImage[]) {
  if (task.referenceImageId && uploads.some((item) => item.id === task.referenceImageId)) return task.referenceImageId;
  const byKind = uploads.find((item) => item.kind === pickKindByTask(task));
  return byKind?.id ?? uploads[0]?.id;
}

function normalizeUploadUrl(url: string, filename?: string) {
  const raw = String(url || "");
  if (raw.startsWith("/api/uploads/")) return raw;
  if (raw.startsWith("/uploads/")) return `/api/uploads/${raw.slice("/uploads/".length)}`;
  if (!raw && filename) return `/api/uploads/${encodeURIComponent(filename)}`;
  return raw;
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [entries, setEntries] = useState<PromptEntry[]>(defaultEntries);
  const [workbenches, setWorkbenches] = useState<WorkbenchTask[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("prompts");
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [toast, setToast] = useState("");

  const active = useMemo(() => workbenches.find((w) => w.id === params.id) ?? null, [workbenches, params.id]);
  const selectedTasks = active?.tasks.filter((task) => task.enabled !== false) ?? [];
  const allTaskChecked = !!active?.tasks.length && active.tasks.every((task) => task.enabled !== false);
  const allRequirementChecked = !!active?.requirements.length && requirementLabels.every((item) => active.requirements.includes(item));

  const persist = (next: WorkbenchTask[]) => {
    setWorkbenches(next);
    writeWorkbenchState({ workbenches: next, activeWorkbenchId: params.id });
  };

  const patchActive = (patch: Partial<WorkbenchTask>) => {
    if (!active) return;
    persist(workbenches.map((w) => (w.id === active.id ? { ...w, ...patch } : w)));
  };

  useEffect(() => {
    const init = async () => {
      const state = readWorkbenchState();
      const entryData = (await fetch("/api/entries").then((r) => r.json())) as PromptEntry[];
      setEntries(entryData);
      if (!state.workbenches.length) return router.push("/custom-image");
      const fixed = state.workbenches.map((w) => ({
        ...w,
        requirements: w.requirements?.length ? w.requirements : requirementLabels,
        dualThread: typeof w.dualThread === "boolean" ? w.dualThread : true,
        tasks: (w.tasks?.length ? w.tasks : buildTasks(entryData)).map((task) => ({ ...task, enabled: task.enabled ?? true })),
      }));
      setWorkbenches(fixed);
      writeWorkbenchState({ workbenches: fixed, activeWorkbenchId: params.id });
    };
    void init();
  }, [params.id, router]);

  useEffect(() => {
    if (!active?.jobId) return;
    const t = setInterval(async () => {
      const data = await fetch(`/api/jobs?id=${active.jobId}`).then((r) => r.json());
      setJob(data);
    }, 1200);
    return () => clearInterval(t);
  }, [active?.jobId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => {
    setToast(message);
  };

  const uploadFiles = async (kind: UploadKind, files: FileList | null) => {
    if (!active || !files?.length) return;
    const added: UploadedImage[] = [];
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        form.append("kind", kind);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const raw = await res.text();
        let item: any = null;
        try {
          item = raw ? JSON.parse(raw) : null;
        } catch {
          throw new Error("上传接口返回异常，请稍后重试");
        }
        if (!res.ok) throw new Error(item?.error || "上传失败");
        if (!item?.url) throw new Error("上传失败：接口未返回文件地址");
        added.push(item as UploadedImage);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "上传失败");
      return;
    }
    const uploads = [...active.uploads, ...added];
    patchActive({ uploads, tasks: active.tasks.map((task) => ({ ...task, referenceImageId: pickReferenceId(task, uploads) })) });
  };

  const removeUpload = (uploadId: string) => {
    if (!active) return;
    const uploads = active.uploads.filter((item) => item.id !== uploadId);
    patchActive({
      uploads,
      tasks: active.tasks.map((task) => ({
        ...task,
        referenceImageId: task.referenceImageId === uploadId ? pickReferenceId(task, uploads) : task.referenceImageId,
      })),
    });
  };

  const productPayload = (w: WorkbenchTask) => ({
    title: w.title,
    customRequirement: w.customRequirement,
    requirements: w.requirements,
    fidelity: w.fidelity,
    uploads: w.uploads,
  });

  const generatePrompts = async () => {
    if (!active) return;
    if (!active.uploads.length) return showToast("最少上传一张图片");
    if (!selectedTasks.length) return showToast("请至少勾选一个词条");
    setLoading(true);
    setStatusMsg("提示词生成中...");
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productPayload(active), tasks: selectedTasks, settings: readClientSettings() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提示词生成失败");
      const byId = new Map((data as PromptTask[]).map((item) => [item.id, item]));
      patchActive({
        tasks: active.tasks.map((task) => {
          const updated = byId.get(task.id);
          return updated ? { ...task, ...updated, enabled: task.enabled, referenceImageId: task.referenceImageId ?? pickReferenceId(task, active.uploads) } : task;
        }),
        name: active.title || active.name,
      });
      setStatusMsg("提示词生成完成");
      showToast("提示词生成完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "提示词生成失败";
      setStatusMsg(`提示词生成失败: ${message}`);
      showToast(`提示词生成失败: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const patchImageAction = async (payload: Record<string, unknown>, okMessage?: string, failMessage?: string) => {
    if (!active?.jobId) return;
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: active.jobId, settings: readClientSettings(), ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || failMessage || "操作失败");
      const latest = await fetch(`/api/jobs?id=${active.jobId}`).then((r) => r.json());
      setJob(latest);
      if (okMessage) showToast(okMessage);
    } catch (error) {
      showToast(error instanceof Error ? error.message : (failMessage || "操作失败"));
    }
  };

  const queueTasks = async (tasks: PromptTask[]) => {
    if (!active || tasks.length === 0 || queueing) return;
    if (!active.uploads.length) return showToast("最少上传一张图片");
    if (tasks.some((task) => !task.prompt.trim())) return showToast("请先补全提示词");
    if (tasks.some((task) => !task.referenceImageId || !active.uploads.some((u) => u.id === task.referenceImageId))) {
      return showToast("每个词条都需要选择参考图片");
    }
    setQueueing(true);
    const latestState = readWorkbenchState();
    const latestWorkbench = latestState.workbenches.find((w) => w.id === params.id) ?? active;
    const currentJobId = latestWorkbench.jobId;
    const body = {
      product: productPayload(latestWorkbench),
      tasks,
      concurrency: latestWorkbench.dualThread ? 2 : 1,
      settings: readClientSettings(),
    };
    let data: any;
    try {
      if (!currentJobId) {
        const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "提交生图任务失败");
      } else {
        const res = await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-tasks", jobId: currentJobId, ...body }) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "追加生图任务失败");
      }
      patchActive({ jobId: data.id, name: latestWorkbench.title || latestWorkbench.name });
      const latest = await fetch(`/api/jobs?id=${data.id}`).then((r) => r.json());
      setJob(latest);
      const waitingOnlyQueued = (latest?.images || []).length > 0 && latest.images.every((img: any) => img.status === "queued" && !img.startedAt);
      if (waitingOnlyQueued) {
        await patchImageAction({ action: "refresh-job" }, "已刷新生成队列");
      }
      setActiveTab("results");
      showToast("生图任务已提交");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "生图任务提交失败");
    } finally {
      setQueueing(false);
    }
  };

  const addTask = () => {
    if (!active || entries.length === 0) return;
    const entry = entries[0];
    const newTask: PromptTask = {
      id: createId(),
      entryId: entry.id,
      type: entry.type,
      title: entry.title,
      size: entry.size,
      prompt: entry.defaultPrompt,
      enabled: true,
      referenceImageId: pickReferenceId({ id: "", entryId: "", type: entry.type, title: entry.title, size: entry.size, prompt: entry.defaultPrompt }, active.uploads),
    };
    patchActive({ tasks: [...active.tasks, newTask] });
  };

  const createWorkbench = () => {
    const name = prompt("输入新任务标题");
    if (!name || entries.length === 0) return;
    const next: WorkbenchTask = {
      id: createId(),
      name,
      title: name,
      customRequirement: "",
      requirements: requirementLabels,
      fidelity: "high",
      uploads: [],
      tasks: buildTasks(entries),
      jobId: "",
      dualThread: true,
    };
    const merged = [...workbenches, next];
    persist(merged);
    router.push(`/workspace/${next.id}`);
  };

  const deleteWorkbench = (id: string) => {
    const target = workbenches.find((w) => w.id === id);
    if (!target) return;
    if (!confirm(`确定删除任务「${target.name}」吗？`)) return;
    const rest = workbenches.filter((w) => w.id !== id);
    if (!rest.length) return (writeWorkbenchState({ workbenches: [], activeWorkbenchId: "" }), router.push("/custom-image"));
    persist(rest);
    router.push(`/workspace/${rest[0].id}`);
  };

  if (!active) return <div className="text-sm text-slate-300">加载中...</div>;

  const mainSizeOptions = ["800x800", "750x1000", "800x1200"];
  const detailSizeOptions = ["800x1200", "790x1200", "750x1200", "800xauto"];

  return (
    <div className="grid gap-4 lg:grid-cols-[240px,440px,1fr]">
      <aside className="panel h-[calc(100vh-120px)] overflow-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">任务列表</div>
          <button className="rounded bg-cyan-700 px-2 py-1 text-xs" onClick={createWorkbench}>新建</button>
        </div>
        <div className="space-y-2">
          {workbenches.map((w) => (
            <div key={w.id} className={`cursor-pointer rounded border p-2 ${w.id === active.id ? "border-cyan-700 bg-slate-800" : "border-slate-700"}`} onClick={() => router.push(`/workspace/${w.id}`)}>
              <div className="mb-2 text-left text-xs">{w.name}</div>
              <button className="rounded bg-slate-700 px-2 py-1 text-[11px]" onClick={(e) => (e.stopPropagation(), deleteWorkbench(w.id))}>删除</button>
            </div>
          ))}
        </div>
      </aside>

      <section className="panel space-y-3 p-4">
        <h2 className="text-base font-semibold">工作台：{active.name}</h2>
        <div className="space-y-2 rounded border border-slate-700 p-3">
          <div className="text-sm font-semibold">产品图片上传框架</div>
          <div className="grid grid-cols-2 gap-2">
            {uploadKinds.map((item) => (
              <label key={item.kind} className="rounded border border-slate-700 px-2 py-2 text-xs">
                <div className="mb-1">{item.label}</div>
                <input type="file" accept="image/*" multiple className="w-full text-[11px]" onChange={(e) => uploadFiles(item.kind, e.target.files)} />
              </label>
            ))}
          </div>
          <div className="text-xs text-amber-300">最少上传一张图片</div>
          <div className="grid grid-cols-4 gap-2">
            {active.uploads.map((u) => (
              <div key={u.id} className="rounded border border-slate-700 p-1">
                <img src={normalizeUploadUrl(u.url, u.filename)} alt={u.originalName} className="h-14 w-full rounded object-cover" />
                <div className="truncate text-[10px] text-slate-300">{u.originalName}</div>
                <button className="mt-1 w-full rounded bg-rose-700 px-1 py-0.5 text-[10px]" onClick={() => removeUpload(u.id)}>删除</button>
              </div>
            ))}
          </div>
        </div>
        <input className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="商品标题" value={active.title} onChange={(e) => patchActive({ title: e.target.value, name: e.target.value || active.name })} />
        <textarea className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="自定义需求" value={active.customRequirement} onChange={(e) => patchActive({ customRequirement: e.target.value })} />
        <div className="flex items-center justify-between">
          <div className="text-sm">需求项</div>
          <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => patchActive({ requirements: allRequirementChecked ? [] : requirementLabels })}>全选</button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {requirementLabels.map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input type="checkbox" checked={active.requirements.includes(item)} onChange={(e) => patchActive({ requirements: e.target.checked ? [...active.requirements, item] : active.requirements.filter((v) => v !== item) })} />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <select className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" value={active.fidelity} onChange={(e) => patchActive({ fidelity: e.target.value as any })}>
          <option value="high">高保真</option>
          <option value="medium">中保真</option>
          <option value="low">低保真</option>
        </select>
        <button className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-50" onClick={generatePrompts} disabled={loading}>一键生成提示词（按勾选词条）</button>
        <div className="text-xs text-cyan-300">{statusMsg}</div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex gap-2 text-sm">
          <button className={`rounded px-3 py-1 ${activeTab === "prompts" ? "bg-slate-700" : "bg-slate-800"}`} onClick={() => setActiveTab("prompts")}>提示词编辑</button>
          <button className={`rounded px-3 py-1 ${activeTab === "results" ? "bg-slate-700" : "bg-slate-800"}`} onClick={() => setActiveTab("results")}>生成结果</button>
        </div>
        {activeTab === "prompts" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={addTask}>添加词条</button>
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={() => patchActive({ tasks: active.tasks.map((task) => ({ ...task, enabled: !allTaskChecked })) })}>全选词条</button>
              <button className="rounded bg-cyan-700 px-3 py-2 text-sm disabled:opacity-50" disabled={queueing} onClick={() => queueTasks(selectedTasks.map((t) => ({ ...t, id: createId() })))}>一键生成图片（按勾选词条）</button>
              <label className="flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-xs">
                <input type="checkbox" checked={active.dualThread} onChange={(e) => patchActive({ dualThread: e.target.checked })} />
                双线程
              </label>
            </div>
            {active.tasks.map((task, idx) => (
              <div key={task.id} className={`rounded border p-3 ${task.type === "main" ? "border-cyan-700/60 bg-cyan-950/20" : "border-amber-700/60 bg-amber-950/20"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={task.enabled !== false} onChange={(e) => patchActive({ tasks: active.tasks.map((item) => (item.id === task.id ? { ...item, enabled: e.target.checked } : item)) })} />
                    <span>{task.type === "main" ? "主图任务" : "详情图任务"}</span>
                  </label>
                  <span className={`text-xs ${task.type === "main" ? "text-cyan-300" : "text-amber-300"}`}>{task.size}</span>
                </div>
                <div className="mb-2 flex gap-2">
                  <select className="flex-1 rounded border border-slate-700 bg-slate-950 p-1 text-sm" value={task.entryId} onChange={(e) => {
                    const entry = entries.find((x) => x.id === e.target.value);
                    if (!entry) return;
                    patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, entryId: entry.id, title: entry.title, size: entry.size, type: entry.type, prompt: entry.defaultPrompt, referenceImageId: pickReferenceId(p, active.uploads) } : p) });
                  }}>
                    {entries.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <select className="w-32 rounded border border-slate-700 bg-slate-950 p-1 text-sm" value={task.size} onChange={(e) => patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, size: e.target.value } : p) })}>
                    {(task.type === "main" ? mainSizeOptions : detailSizeOptions).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <select className="mb-2 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" value={task.referenceImageId || ""} onChange={(e) => patchActive({ tasks: active.tasks.map((item) => (item.id === task.id ? { ...item, referenceImageId: e.target.value || undefined } : item)) })}>
                  <option value="">选择词条对应图片（可人工纠错）</option>
                  {active.uploads.map((u) => (
                    <option key={u.id} value={u.id}>{uploadKinds.find((k) => k.kind === u.kind)?.label || "其它图"} - {u.originalName}</option>
                  ))}
                </select>
                <textarea className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" value={task.prompt} onChange={(e) => patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, prompt: e.target.value } : p) })} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => patchActive({ tasks: active.tasks.filter((p) => p.id !== task.id) })}>删除词条</button>
                  <button className="rounded bg-cyan-700 px-2 py-1 text-xs disabled:opacity-50" disabled={queueing} onClick={() => queueTasks([{ ...task, id: createId() }])}>生成图片</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">任务状态：{job?.status || "未开始"}</div>
              <button
                className="rounded bg-slate-700 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!active.jobId}
                onClick={() => patchImageAction({ action: "refresh-job" }, "已刷新生成队列")}
              >
                刷新生成
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {(job?.images || []).map((img: any) => (
                <div key={img.id} className={`rounded border p-2 ${(img.size || "").includes("800x1200") || (img.size || "").includes("790x1200") || (img.size || "").includes("750x1200") || (img.size || "").includes("800xauto") ? "border-amber-700/60 bg-amber-950/20" : "border-cyan-700/60 bg-cyan-950/20"}`}>
                  <div className="mb-1 text-xs">{img.title}</div>
                  <div className="mb-2 text-xs text-slate-400">{img.status} {img.progress}%</div>
                  {img.outputUrl ? <img src={img.outputUrl} alt={img.title} className="aspect-square w-full cursor-zoom-in rounded object-cover" onClick={() => setPreviewUrl(img.outputUrl)} /> : <div className="aspect-square rounded bg-slate-800" />}
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-slate-700 px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!["queued", "paused"].includes(img.status) || Boolean(img.startedAt)}
                      onClick={() => patchImageAction({ action: img.status === "paused" ? "resume-image" : "pause-image", imageId: img.id }, img.status === "paused" ? "已继续排队" : "已暂停")}
                    >
                      {img.status === "paused" ? "继续" : "暂停"}
                    </button>
                    <button
                      className="rounded bg-rose-700 px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(img.startedAt)}
                      onClick={() => patchImageAction({ action: "cancel-image", imageId: img.id }, "已取消未请求图片")}
                    >
                      取消
                    </button>
                    {img.status === "failed" ? (
                      <button
                        className="rounded bg-amber-700 px-2 py-1 text-[11px]"
                        onClick={() => patchImageAction({ action: "regenerate-image", imageId: img.id }, "已重试，重新排队")}
                      >
                        重试
                      </button>
                    ) : null}
                  </div>
                  {img.error ? <div className="mt-1 text-[11px] text-rose-300">失败：{img.error}</div> : null}
                </div>
              ))}
            </div>
            {previewUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setPreviewUrl("")}><img src={previewUrl} alt="预览图" className="max-h-full max-w-full rounded" /></div> : null}
          </div>
        )}
      </section>
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded bg-black/85 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { defaultEntries, requirementLabels } from "@/lib/defaults";
import { PromptEntry, PromptTask, UploadedImage } from "@/lib/types";
import { buildTasks, readWorkbenchState, WorkbenchTask, writeWorkbenchState } from "@/lib/workbench-store";

type Tab = "prompts" | "results";

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

  const active = useMemo(
    () => workbenches.find((w) => w.id === params.id) ?? null,
    [workbenches, params.id]
  );

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
      if (!state.workbenches.length) {
        router.push("/");
        return;
      }
      const fixed = state.workbenches.map((w) => ({ ...w, tasks: w.tasks?.length ? w.tasks : buildTasks(entryData) }));
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

  const uploadFiles = async (files: FileList | null) => {
    if (!active || !files?.length) return;
    const added: UploadedImage[] = [];
    for (const f of Array.from(files)) {
      const form = new FormData();
      form.append("file", f);
      form.append("kind", "product");
      const item = await fetch("/api/upload", { method: "POST", body: form }).then((r) => r.json());
      added.push(item);
    }
    patchActive({ uploads: [...active.uploads, ...added] });
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
    setLoading(true);
    setStatusMsg("提示词生成中...");
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productPayload(active), tasks: active.tasks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提示词生成失败");
      patchActive({ tasks: data, name: active.title || active.name });
      setStatusMsg("提示词生成完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "提示词生成失败";
      setStatusMsg(`提示词生成失败: ${message}`);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const generatePromptForTask = async (task: PromptTask) => {
    if (!active) return;
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productPayload(active), tasks: [task] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提示词生成失败");
      const updated = data[0] as PromptTask;
      patchActive({ tasks: active.tasks.map((t) => (t.id === task.id ? updated : t)) });
    } catch (error) {
      alert(error instanceof Error ? error.message : "提示词生成失败");
    }
  };

  const queueTasks = async (tasks: PromptTask[]) => {
    if (!active || tasks.length === 0 || queueing) return;
    setQueueing(true);
    const latestState = readWorkbenchState();
    const latestWorkbench = latestState.workbenches.find((w) => w.id === params.id) ?? active;
    const currentJobId = latestWorkbench.jobId;
    const body = { product: productPayload(latestWorkbench), tasks, concurrency: latestWorkbench.dualThread ? 2 : 1 };
    let data: any;
    try {
      if (!currentJobId) {
        data = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      } else {
        data = await fetch("/api/jobs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add-tasks", jobId: currentJobId, ...body }),
        }).then((r) => r.json());
      }
      patchActive({ jobId: data.id, name: latestWorkbench.title || latestWorkbench.name });
      const latest = await fetch(`/api/jobs?id=${data.id}`).then((r) => r.json());
      setJob(latest);
      setActiveTab("results");
    } finally {
      setQueueing(false);
    }
  };

  const addTask = () => {
    if (!active || entries.length === 0) return;
    const entry = entries[0];
    patchActive({
      tasks: [...active.tasks, {
        id: crypto.randomUUID(),
        entryId: entry.id,
        type: entry.type,
        title: entry.title,
        size: entry.size,
        prompt: entry.defaultPrompt,
      }],
    });
  };

  const createWorkbench = () => {
    const name = prompt("输入新任务标题");
    if (!name || entries.length === 0) return;
    const next: WorkbenchTask = {
      id: crypto.randomUUID(),
      name,
      title: name,
      customRequirement: "",
      requirements: [],
      fidelity: "high",
      uploads: [],
      tasks: buildTasks(entries),
      jobId: "",
      dualThread: false,
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
    if (!rest.length) {
      writeWorkbenchState({ workbenches: [], activeWorkbenchId: "" });
      router.push("/");
      return;
    }
    persist(rest);
    const nextId = rest[0].id;
    router.push(`/workspace/${nextId}`);
  };

  const saveTemplate = async () => {
    if (!active) return;
    const name = prompt("输入模板标题");
    if (!name) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tasks: active.tasks }),
    });
    setStatusMsg(`模板「${name}」已保存`);
  };

  const patchImageAction = async (payload: Record<string, unknown>) => {
    if (!active?.jobId) return;
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: active.jobId, ...payload }),
    });
    const latest = await fetch(`/api/jobs?id=${active.jobId}`).then((r) => r.json());
    setJob(latest);
  };

  if (!active) return <div className="text-sm text-slate-300">加载中...</div>;

  const mainSizeOptions = ["800x800", "750x1000", "800x1200"];
  const detailSizeOptions = ["800x1200", "790x1200", "750x1200", "800xauto"];

  return (
    <div className="grid gap-4 lg:grid-cols-[240px,380px,1fr]">
      <aside className="panel h-[calc(100vh-120px)] overflow-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">任务列表</div>
          <button className="rounded bg-cyan-700 px-2 py-1 text-xs" onClick={createWorkbench}>新建</button>
        </div>
        <div className="space-y-2">
          {workbenches.map((w) => (
            <div
              key={w.id}
              className={`cursor-pointer rounded border p-2 ${w.id === active.id ? "border-cyan-700 bg-slate-800" : "border-slate-700"}`}
              onClick={() => router.push(`/workspace/${w.id}`)}
            >
              <div className="mb-2 text-left text-xs">{w.name}</div>
              <button
                className="rounded bg-slate-700 px-2 py-1 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteWorkbench(w.id);
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="panel space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">工作台：{active.name}</h2>
          <div className="flex gap-2">
            <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => window.location.reload()}>刷新页面</button>
          </div>
        </div>
        <input type="file" multiple className="w-full text-sm" onChange={(e) => uploadFiles(e.target.files)} />
        <div className="grid gap-2 text-xs text-slate-300">
          {active.uploads.map((u) => <div key={u.id} className="rounded border border-slate-700 px-2 py-1">{u.originalName}</div>)}
        </div>
        <input className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="商品标题" value={active.title} onChange={(e) => patchActive({ title: e.target.value, name: e.target.value || active.name })} />
        <textarea className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="自定义需求" value={active.customRequirement} onChange={(e) => patchActive({ customRequirement: e.target.value })} />
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
        <button className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" onClick={generatePrompts} disabled={loading}>生成提示词</button>
        <div className="text-xs text-cyan-300">{statusMsg}</div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex gap-2 text-sm">
          <button className={`rounded px-3 py-1 ${activeTab === "prompts" ? "bg-slate-700" : "bg-slate-800"}`} onClick={() => setActiveTab("prompts")}>提示词编辑</button>
          <button className={`rounded px-3 py-1 ${activeTab === "results" ? "bg-slate-700" : "bg-slate-800"}`} onClick={() => setActiveTab("results")}>生成结果</button>
        </div>
        {activeTab === "prompts" ? (
          <div className="space-y-3">
            {active.tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`rounded border p-3 ${task.type === "main" ? "border-cyan-700/60 bg-cyan-950/20" : "border-amber-700/60 bg-amber-950/20"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${task.type === "main" ? "bg-cyan-800/70 text-cyan-100" : "bg-amber-800/70 text-amber-100"}`}>
                    {task.type === "main" ? "主图任务" : "详情图任务"}
                  </span>
                  <span className={`text-xs ${task.type === "main" ? "text-cyan-300" : "text-amber-300"}`}>{task.size}</span>
                </div>
                <div className="mb-2 flex gap-2">
                  <select className="flex-1 rounded border border-slate-700 bg-slate-950 p-1 text-sm" value={task.entryId} onChange={(e) => {
                    const entry = entries.find((x) => x.id === e.target.value);
                    if (!entry) return;
                    patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, entryId: entry.id, title: entry.title, size: entry.size, type: entry.type, prompt: entry.defaultPrompt } : p) });
                  }}>
                    {entries.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <select
                    className="w-32 rounded border border-slate-700 bg-slate-950 p-1 text-sm"
                    value={task.size}
                    onChange={(e) => patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, size: e.target.value } : p) })}
                  >
                    {(task.type === "main" ? mainSizeOptions : detailSizeOptions).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <textarea className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" value={task.prompt} onChange={(e) => patchActive({ tasks: active.tasks.map((p, i) => i === idx ? { ...p, prompt: e.target.value } : p) })} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => patchActive({ tasks: active.tasks.filter((p) => p.id !== task.id) })}>删除词条</button>
                  <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => generatePromptForTask(task)}>生成词条提示词</button>
                  <button className="rounded bg-cyan-700 px-2 py-1 text-xs disabled:opacity-50" disabled={queueing} onClick={() => queueTasks([{ ...task, id: crypto.randomUUID() }])}>生成图片</button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={addTask}>添加词条</button>
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={saveTemplate}>保存全套模板</button>
              <button className="rounded bg-cyan-700 px-3 py-2 text-sm hover:bg-cyan-600 disabled:opacity-50" disabled={queueing} onClick={() => queueTasks(active.tasks.map((t) => ({ ...t, id: crypto.randomUUID() })))}>一键生成全部图片</button>
              <label className="flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-xs">
                <input type="checkbox" checked={active.dualThread} onChange={(e) => patchActive({ dualThread: e.target.checked })} />
                双线程
              </label>
              <button className={`rounded px-3 py-2 text-sm ${active.jobId ? "bg-emerald-700 hover:bg-emerald-600" : "cursor-not-allowed bg-slate-700/50 text-slate-400"}`} onClick={() => active.jobId && window.open(`/api/download?jobId=${active.jobId}`, "_blank")} disabled={!active.jobId}>
                打包下载所有图片
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-300">任务状态：{job?.status || "未开始"}</div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {(job?.images || []).map((img: any) => (
                <div
                  key={img.id}
                  className={`rounded border p-2 ${(img.size || "").includes("800x1200") || (img.size || "").includes("790x1200") || (img.size || "").includes("750x1200") || (img.size || "").includes("800xauto") ? "border-amber-700/60 bg-amber-950/20" : "border-cyan-700/60 bg-cyan-950/20"}`}
                >
                  <div className="mb-1 text-xs">{img.title}</div>
                  <div className="mb-2 text-xs text-slate-400">{img.status} {img.progress}%</div>
                  {img.outputUrl ? <img src={img.outputUrl} alt={img.title} className="aspect-square w-full cursor-zoom-in rounded object-cover" onClick={() => setPreviewUrl(img.outputUrl)} /> : <div className="aspect-square rounded bg-slate-800" />}
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-slate-700 px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(img.startedAt) || !["queued", "paused"].includes(img.status)}
                      onClick={() => patchImageAction({ action: img.status === "paused" ? "resume-image" : "pause-image", imageId: img.id })}
                    >
                      {img.status === "paused" ? "继续" : "暂停"}
                    </button>
                    <button
                      className="rounded bg-rose-700 px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(img.startedAt)}
                      onClick={() => patchImageAction({ action: "cancel-image", imageId: img.id })}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {previewUrl ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setPreviewUrl("")}>
                <img src={previewUrl} alt="预览图" className="max-h-full max-w-full rounded" />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

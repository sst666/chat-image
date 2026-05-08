"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildTasks, readWorkbenchState, WorkbenchTask, writeWorkbenchState } from "@/lib/workbench-store";
import { createId } from "@/lib/id";

export default function TemplatesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [defaultPromptText, setDefaultPromptText] = useState("");
  const [type, setType] = useState("main");

  const load = async () => {
    const [e, t] = await Promise.all([fetch("/api/entries").then((r) => r.json()), fetch("/api/templates").then((r) => r.json())]);
    setEntries(e);
    setTemplates(t);
  };
  useEffect(() => { void load(); }, []);

  const applyTemplate = (item: any) => {
    const taskTitle = prompt("输入新任务标题");
    if (!taskTitle) return;
    const state = readWorkbenchState();
    const task: WorkbenchTask = {
      id: createId(),
      name: taskTitle,
      title: taskTitle,
      customRequirement: "",
      requirements: [],
      fidelity: "high",
      uploads: [],
      tasks: item.tasks?.length ? item.tasks.map((t: any) => ({ ...t, id: createId() })) : buildTasks(entries),
      jobId: "",
      dualThread: true,
    };
    writeWorkbenchState({
      workbenches: [...state.workbenches, task],
      activeWorkbenchId: task.id,
    });
    router.push(`/workspace/${task.id}`);
  };

  const defaultTemplateTasks = entries.map((item) => ({
    title: item.title,
    type: item.type,
    size: item.size,
    prompt: item.defaultPrompt,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">词条管理</h2>
        <div className="mb-3 grid gap-2">
          <input className="rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="h-24 rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="默认提示词" value={defaultPromptText} onChange={(e) => setDefaultPromptText(e.target.value)} />
          <select className="rounded border border-slate-700 bg-slate-950 p-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="main">主图</option>
            <option value="detail">详情图</option>
          </select>
          <button className="rounded bg-cyan-700 px-3 py-2 text-sm" onClick={async () => {
            await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, defaultPrompt: defaultPromptText, type }) });
            setTitle(""); setDefaultPromptText(""); await load();
          }}>新增词条</button>
        </div>
        <div className="space-y-2 text-sm">
          {entries.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border border-slate-700 p-2">
              <div>{item.title}</div>
              <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={async () => { await fetch(`/api/entries?id=${item.id}`, { method: "DELETE" }); await load(); }}>删除</button>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">提示词模板</h2>
        <div className="mb-3 rounded border border-slate-700 p-3">
          <div className="mb-2 text-sm font-semibold">默认模板（系统）</div>
          <div className="mb-2 text-xs text-slate-400">系统内置词条模板集合</div>
          <div className="max-h-44 space-y-1 overflow-auto text-xs text-slate-300">
            {defaultTemplateTasks.map((t, i) => (
              <div key={`${t.title}-${i}`} className="rounded border border-slate-800 px-2 py-1">
                [{t.type === "main" ? "主图" : "详情"}] {t.title} / {t.size}
              </div>
            ))}
          </div>
          <button
            className="mt-2 rounded bg-cyan-700 px-2 py-1 text-xs"
            onClick={() => applyTemplate({
              tasks: entries.map((e) => ({
                id: createId(),
                entryId: e.id,
                type: e.type,
                title: e.title,
                size: e.size,
                prompt: e.defaultPrompt,
              })),
            })}
          >
            使用默认模板创建任务
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {templates.map((item) => (
            <div key={item.id} className="rounded border border-slate-700 p-2">
              <div className="mb-2">{item.name}</div>
              <div className="flex gap-2">
                <button className="rounded bg-cyan-700 px-2 py-1 text-xs" onClick={() => applyTemplate(item)}>使用模板创建任务</button>
                <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={async () => {
                  await fetch(`/api/templates?id=${item.id}`, { method: "DELETE" });
                  await load();
                }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

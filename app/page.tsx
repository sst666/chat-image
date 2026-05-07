"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildTasks, readWorkbenchState, WorkbenchTask, writeWorkbenchState } from "@/lib/workbench-store";
import { PromptEntry } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [title, setTitle] = useState("");
  const [workbenches, setWorkbenches] = useState<WorkbenchTask[]>([]);

  useEffect(() => {
    fetch("/api/entries").then((r) => r.json()).then(setEntries);
    const state = readWorkbenchState();
    setWorkbenches(state.workbenches);
  }, []);

  const createTask = () => {
    if (!title.trim() || entries.length === 0) return;
    const state = readWorkbenchState();
    const task: WorkbenchTask = {
      id: crypto.randomUUID(),
      name: title.trim(),
      title: title.trim(),
      customRequirement: "",
      requirements: [],
      fidelity: "high",
      uploads: [],
      tasks: buildTasks(entries),
      jobId: "",
      dualThread: false,
    };
    const next = { workbenches: [...state.workbenches, task], activeWorkbenchId: task.id };
    writeWorkbenchState(next);
    router.push(`/workspace/${task.id}`);
  };

  return (
    <section className="panel mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">生图任务</h1>
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded border border-slate-700 bg-slate-950 p-2 text-sm"
          placeholder="输入任务标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="rounded bg-cyan-700 px-4 py-2 text-sm" onClick={createTask}>创建任务</button>
      </div>
      <div className="space-y-2">
        {workbenches.map((w) => (
          <button key={w.id} className="block w-full rounded border border-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-800" onClick={() => router.push(`/workspace/${w.id}`)}>
            {w.name}
          </button>
        ))}
      </div>
    </section>
  );
}

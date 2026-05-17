"use client";

import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [list, setList] = useState<any[]>([]);
  const load = async () => setList(await fetch("/api/history").then((r) => r.json()));
  useEffect(() => { void load(); }, []);
  return (
    <section className="panel p-4">
      <h2 className="mb-4 text-base font-semibold">历史记录</h2>
      <div className="space-y-3">
        {list.map((job) => (
          <div key={job.id} className="rounded border border-slate-700 p-3">
            <div className="mb-1 text-sm">{job.title}</div>
            <div className="mb-2 text-xs text-slate-400">{job.status} / {job.createdAt}</div>
            <div className="flex gap-2">
              <a className="rounded bg-cyan-700 px-2 py-1 text-xs" href={`/api/download?jobId=${job.id}`}>普通下载</a>
              <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={async () => { await fetch(`/api/history?id=${job.id}`, { method: "DELETE" }); await load(); }}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

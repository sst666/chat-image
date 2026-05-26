"use client";

import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/history", { cache: "no-store" });
      if (!response.ok) throw new Error(`历史记录加载失败（${response.status}）`);
      const data = await response.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "历史记录加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-4">
      <div className="app-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">历史记录</h2>
            <p className="app-muted mt-1 text-sm">查看历史生图任务并进行下载。</p>
          </div>
          <button className="app-button-secondary px-4 py-2 text-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="app-card rounded-3xl p-5 text-sm app-status-danger">{error}</div>
      ) : null}

      <div className="space-y-3">
        {!loading && list.length === 0 ? (
          <div className="app-card-soft rounded-2xl px-4 py-10 text-center text-sm app-muted">暂无历史记录</div>
        ) : null}
        {list.map((job) => (
          <div key={job.id} className="app-card rounded-2xl p-4">
            <div className="mb-1 text-sm font-semibold">{job.title || "未命名任务"}</div>
            <div className="mb-3 text-xs app-muted">{job.status} / {job.createdAt}</div>
            <div className="flex flex-wrap gap-2">
              <a className="app-button-primary px-3 py-2 text-xs" href={`/api/download?jobId=${job.id}`}>普通下载</a>
              <button
                className="app-button-danger px-3 py-2 text-xs"
                onClick={async () => {
                  await fetch(`/api/history?id=${job.id}`, { method: "DELETE" });
                  await load();
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

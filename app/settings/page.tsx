"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData);
    fetch("/api/logs").then((r) => r.json()).then(setLogs);
  }, []);
  if (!data) return <div className="text-sm text-slate-300">加载中...</div>;

  return (
    <section className="space-y-4">
      <div className="panel max-w-2xl p-4">
      <h2 className="mb-4 text-base font-semibold">设置</h2>
      <div className="grid gap-2 text-sm">
        {[
          ["baseUrl", "API Base URL"],
          ["apiKey", "API Key"],
          ["promptModel", "提示词模型"],
          ["imageModel", "图片模型"],
          ["concurrency", "并发数"],
          ["retries", "重试次数"],
        ].map(([k, label]) => (
          <label key={k} className="grid gap-1">
            <span className="text-slate-300">{label}</span>
            <input
              className="rounded border border-slate-700 bg-slate-950 p-2"
              value={String(data[k] ?? "")}
              onChange={(e) => setData((prev: any) => ({ ...prev, [k]: ["concurrency", "retries"].includes(k) ? Number(e.target.value) : e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button className="rounded bg-cyan-700 px-3 py-2 text-sm" onClick={async () => {
          const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          const next = await res.json();
          setData(next);
          setMsg("保存成功");
        }}>保存</button>
        <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={async () => {
          const res = await fetch("/api/test-connection", { method: "POST" });
          const t = await res.json();
          setMsg(t.message || (t.ok ? "连接成功" : "连接失败"));
        }}>测试连接</button>
      </div>
      <div className="mt-3 text-sm text-cyan-300">{msg}</div>
      </div>

      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">生成与报错记录</h3>
          <button className="rounded bg-slate-700 px-3 py-1 text-xs" onClick={async () => setLogs(await fetch("/api/logs").then((r) => r.json()))}>刷新</button>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-auto text-sm">
          {logs.map((log) => (
            <div key={log.id} className="rounded border border-slate-700 p-2">
              <div className={log.type === "error" ? "text-rose-300" : "text-cyan-300"}>{log.type === "error" ? "报错" : "生成"}: {log.message}</div>
              <div className="text-slate-300">{log.detail}</div>
              <div className="text-xs text-slate-500">{log.createdAt}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

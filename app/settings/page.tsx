"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData);
    fetch("/api/logs").then((r) => r.json()).then(setLogs);
  }, []);

  if (!data) return <div className="text-sm app-muted">加载中...</div>;

  const backupImageModels = Array.isArray(data.backupImageModels) ? data.backupImageModels : [];

  return (
    <section className="space-y-4">
      <div className="app-card max-w-3xl rounded-3xl p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">设置</h2>
            <p className="app-muted mt-1 text-sm">统一管理接口、Key 和生图模型重试顺序。</p>
          </div>
          <div className="app-card-soft rounded-2xl px-4 py-3 text-sm">
            <div className="font-medium">客服微信：mjzsst</div>
            <div className="app-muted mt-1 text-xs">任何问题请联系客服</div>
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          {[
            ["baseUrl", "API Base URL"],
            ["apiKey", "API Key"],
            ["imageModel", "默认生图模型"],
            ["retries", "重试次数"],
          ].map(([k, label]) => (
            <label key={k} className="grid gap-1.5">
              <span className="app-muted">{label}</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="app-input"
                  value={String(data[k] ?? "")}
                  disabled={k === "baseUrl"}
                  readOnly={k === "baseUrl"}
                  onChange={(e) =>
                    setData((prev: any) => ({
                      ...prev,
                      [k]: k === "retries" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                />
                {k === "baseUrl" ? (
                  <a
                    href="https://api.bywlai.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-button-secondary shrink-0 px-4 py-3 text-xs"
                  >
                    获取 Key
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </label>
          ))}

          <div className="grid gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-muted)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">备用生图模型</div>
                <div className="app-muted mt-1 text-xs">生图失败时会按从上到下顺序自动切换重试，可以只保留主模型。</div>
              </div>
              <button
                type="button"
                className="app-button-secondary px-3 py-2 text-xs"
                onClick={() =>
                  setData((prev: any) => ({
                    ...prev,
                    backupImageModels: [...(Array.isArray(prev.backupImageModels) ? prev.backupImageModels : []), ""],
                  }))
                }
              >
                <Plus size={14} />
                添加备用模型
              </button>
            </div>

            {backupImageModels.length ? (
              <div className="space-y-2">
                {backupImageModels.map((model: string, index: number) => (
                  <div key={`backup-${index}`} className="flex gap-2">
                    <input
                      className="app-input"
                      placeholder={index === 0 ? "例如：gpt-image" : "输入备用模型名称"}
                      value={model}
                      onChange={(e) =>
                        setData((prev: any) => ({
                          ...prev,
                          backupImageModels: (prev.backupImageModels || []).map((item: string, itemIndex: number) =>
                            itemIndex === index ? e.target.value : item
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="app-button-danger px-3 py-2 text-xs"
                      onClick={() =>
                        setData((prev: any) => ({
                          ...prev,
                          backupImageModels: (prev.backupImageModels || []).filter((_: string, itemIndex: number) => itemIndex !== index),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="app-muted text-xs">当前仅使用主生图模型，不启用备用模型。</div>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            className="app-button-primary px-4 py-3 text-sm"
            onClick={async () => {
              const payload = {
                ...data,
                backupImageModels: backupImageModels.map((item: string) => String(item || "").trim()).filter(Boolean),
              };
              const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const next = await res.json();
              setData(next);
              setMsg("保存成功");
            }}
          >
            保存
          </button>
          <button
            className="app-button-secondary px-4 py-3 text-sm"
            onClick={async () => {
              const res = await fetch("/api/test-connection", { method: "POST" });
              const t = await res.json();
              setMsg(t.message || (t.ok ? "连接成功" : "连接失败"));
            }}
          >
            测试连接
          </button>
        </div>
        <div className="mt-3 text-sm app-status-success">{msg}</div>
      </div>

      <div className="app-card rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">生成与报错记录</h3>
          <button className="app-button-secondary px-3 py-2 text-xs" onClick={async () => setLogs(await fetch("/api/logs").then((r) => r.json()))}>
            刷新
          </button>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-auto text-sm">
          {logs.map((log) => (
            <div key={log.id} className="app-card-soft rounded-2xl p-3">
              <div className={log.type === "error" ? "app-status-danger" : "app-status-success"}>
                {log.type === "error" ? "报错" : "生成"}: {log.message}
              </div>
              <div className="app-muted mt-1">{log.detail}</div>
              <div className="app-muted mt-2 text-xs">{log.createdAt}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

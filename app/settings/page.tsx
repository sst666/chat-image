"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 10000);
      const [settingsRes, logsRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store", signal: controller.signal }),
        fetch("/api/logs", { cache: "no-store", signal: controller.signal }),
      ]);
      if (!settingsRes.ok) {
        throw new Error(`设置加载失败（${settingsRes.status}）`);
      }
      const settings = await settingsRes.json();
      const logsData = logsRes.ok ? await logsRes.json() : [];
      setData(settings);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "设置加载失败，请重试");
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  if (loading) return <div className="text-sm app-muted">加载中...</div>;
  if (loadError) {
    return (
      <div className="app-card max-w-2xl rounded-3xl p-6">
        <div className="text-sm app-status-danger">{loadError}</div>
        <button className="app-button-secondary mt-4 px-4 py-2 text-sm" onClick={() => void loadPageData()}>
          重新加载
        </button>
      </div>
    );
  }
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
              try {
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
                if (!res.ok) {
                  setMsg(next?.message || `保存失败（${res.status}）`);
                  return;
                }
                if (!next || typeof next !== "object") {
                  setMsg("保存失败：返回数据异常");
                  return;
                }
                setData(next);
                setMsg("保存成功");
              } catch (error) {
                setMsg(error instanceof Error ? `保存失败：${error.message}` : "保存失败");
              }
            }}
          >
            保存
          </button>
          <button
            className="app-button-secondary px-4 py-3 text-sm"
            onClick={async () => {
              try {
                const res = await fetch("/api/test-connection", { method: "POST" });
                const t = await res.json();
                if (!res.ok) {
                  setMsg(t?.message || `连接失败（${res.status}）`);
                  return;
                }
                setMsg(t.message || (t.ok ? "连接成功" : "连接失败"));
              } catch (error) {
                setMsg(error instanceof Error ? `连接失败：${error.message}` : "连接失败");
              }
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

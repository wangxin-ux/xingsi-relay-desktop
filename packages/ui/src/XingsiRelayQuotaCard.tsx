import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { usePlatform } from "./hooks/usePlatform.js";
import { useXingsiRelaySessionStore } from "./store/xingsiRelaySessionStore.js";

export function XingsiRelayQuotaCard() {
  const platform = usePlatform();
  const session = useXingsiRelaySessionStore((state) => state.session);
  const sessionId = session?.quotaSessionId;
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    if (!sessionId || !platform.readXingsiRelayQuota) return;
    let disposed = false;
    let pending = false;
    const refresh = async () => {
      if (pending || disposed) return;
      pending = true;
      setRefreshing(true);
      try {
        const quota = await platform.readXingsiRelayQuota!(sessionId);
        if (!disposed) {
          useXingsiRelaySessionStore.getState().updateQuota(sessionId, quota);
          setFailed(false);
        }
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        pending = false;
        if (!disposed) setRefreshing(false);
      }
    };
    setFailed(false);
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [platform, sessionId, refreshVersion]);
  if (!session || !platform.readXingsiRelayQuota) return null;
  const percent = session.quota?.remainingPercent;
  const value = typeof percent === "number" && !failed ? Math.round(percent) : null;
  return (
    <section
      className="rounded-xl border border-popover-border px-3 py-3"
      aria-label="中转套餐剩余额度"
    >
      <div className="flex items-center justify-between gap-3 text-ui-caption">
        <span className="min-w-0 truncate text-foreground" title={session.quota?.groupName}>
          {session.quota?.groupName ?? "暂无有效订阅"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="刷新额度"
            title="刷新额度"
            disabled={refreshing || !sessionId}
            onClick={() => setRefreshVersion((version) => version + 1)}
            className="rounded p-1 text-foreground/60 hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
          </button>
          <span
            className={value === null ? "text-foreground/60" : "text-teal-600 dark:text-teal-400"}
          >
            {refreshing && value === null
              ? "查询中"
              : failed
                ? "暂不可用"
                : value === null
                  ? "暂无额度信息"
                  : `${value}%`}
          </span>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-label="剩余额度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : value}
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-[width] dark:bg-teal-400"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </section>
  );
}

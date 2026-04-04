"use client";

import { useEffect, useState } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconBug,
  IconGitPullRequest,
  IconSparkles,
  IconShieldCheck,
  IconServer,
  IconArrowRight,
  IconClock,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import {
  fetchAIActions,
  fetchLatencyTimeSeries,
  type DashboardStats,
} from "@/lib/mock-api";
import { fetchRealServices, fetchRealMetrics, type ServiceMetrics } from "@/lib/api-client";
import type { AIAction, TimeSeriesData } from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLOR: Record<string, string> = {
  healthy: "hsl(142, 65%, 45%)",
  warning: "hsl(38, 85%, 50%)",
  critical: "hsl(0, 65%, 52%)",
  unknown: "hsl(220, 10%, 40%)",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const aiActionIcon = (type: string) => {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "bug_detected": return <IconBug className={cls} />;
    case "pr_created": return <IconGitPullRequest className={cls} />;
    case "anomaly_detected": return <IconAlertTriangle className={cls} />;
    case "fix_generated": return <IconSparkles className={cls} />;
    case "auto_resolved": return <IconShieldCheck className={cls} />;
    default: return <IconActivity className={cls} />;
  }
};

interface ServiceRow {
  id: string;
  name: string;
  status: string;
  uptime: number;
  avgLatency: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [latencyData, setLatencyData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    // Load AI actions + latency time-series from mock (not yet wired to backend)
    const [actionsData, latencyRaw] = await Promise.all([
      fetchAIActions(),
      fetchLatencyTimeSeries(),
    ]);
    setActions(actionsData);
    setLatencyData(latencyRaw);

    // Load real services + metrics
    try {
      const raw = await fetchRealServices();
      const metricsList = await Promise.allSettled(
        raw.map((s) => fetchRealMetrics(s.id)),
      );

      const rows: ServiceRow[] = raw.map((svc, i) => {
        const m = metricsList[i];
        const metrics: Partial<ServiceMetrics> =
          m.status === "fulfilled" ? m.value : {};
        return {
          id: svc.id,
          name: svc.name,
          status: metrics.status ?? "unknown",
          uptime: metrics.uptime ?? 0,
          avgLatency: metrics.avgLatency ?? 0,
        };
      });

      setServices(rows);

      // Compute dashboard stats from real data
      if (rows.length > 0) {
        const healthy = rows.filter((s) => s.status === "healthy").length;
        const warning = rows.filter((s) => s.status === "warning").length;
        const critical = rows.filter((s) => s.status === "critical").length;
        const avgUptime =
          Math.round(
            (rows.reduce((a, s) => a + s.uptime, 0) / rows.length) * 100,
          ) / 100;
        const avgLatency = Math.round(
          rows.reduce((a, s) => a + s.avgLatency, 0) / rows.length,
        );
        setStats({
          totalServices: rows.length,
          avgUptime,
          avgLatency,
          avgErrorRate: 0,
          activeIncidents: critical,
          healthyCount: healthy,
          warningCount: warning,
          criticalCount: critical,
        });
      }
    } catch {
      // Backend not reachable — leave stats null
    }

    setLoading(false);
  }

  // Area chart: last 24 points from first latency series
  const chartData =
    latencyData.length > 0
      ? latencyData[0].data
          .filter((_, i) => i % 12 === 0)
          .slice(-24)
          .map((point, idx) => {
            const d: Record<string, string | number> = {
              time: new Date(point.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            latencyData.forEach((series) => {
              const sampled = series.data.filter((_, i) => i % 12 === 0).slice(-24);
              d[series.label] = sampled[idx]?.value ?? 0;
            });
            return d;
          })
      : [];

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time monitoring overview"
      />

      <div className="p-6 space-y-6">
        {/* ── Stats row ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Services",
              value: loading ? "—" : `${stats?.totalServices ?? 0}`,
            },
            {
              label: "Avg Uptime",
              value: loading ? "—" : `${stats?.avgUptime ?? 0}%`,
            },
            {
              label: "Avg Latency",
              value: loading ? "—" : `${stats?.avgLatency ?? 0}ms`,
            },
            {
              label: "Critical",
              value: loading ? "—" : `${stats?.criticalCount ?? 0}`,
              accent: (stats?.criticalCount ?? 0) > 0,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-[hsl(220,13%,15%)] bg-[hsl(220,13%,10%)] px-4 py-4"
            >
              <p className="text-[11px] text-[hsl(220,10%,42%)]">{card.label}</p>
              <p
                className={`mt-1.5 text-2xl font-semibold tracking-tight ${
                  card.accent
                    ? "text-[hsl(0,65%,58%)]"
                    : "text-white"
                }`}
              >
                {loading ? (
                  <span className="inline-block h-7 w-12 animate-pulse rounded bg-[hsl(220,13%,14%)]" />
                ) : (
                  card.value
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ── Charts + actions row ───────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Latency area chart */}
          <div className="col-span-1 rounded-lg border border-[hsl(220,13%,15%)] bg-[hsl(220,13%,10%)] p-5 lg:col-span-3">
            <div className="mb-4">
              <p className="text-sm font-medium text-white">Latency trends</p>
              <p className="mt-0.5 text-xs text-[hsl(220,10%,40%)]">
                Past 24 h · mock data
              </p>
            </div>
            {loading ? (
              <Skeleton className="h-[180px] rounded bg-[hsl(220,13%,12%)]" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    {latencyData.map((s) => (
                      <linearGradient
                        key={s.label}
                        id={`grad-${s.label}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(220, 13%, 14%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "hsl(220, 10%, 35%)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220, 10%, 35%)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 13%, 12%)",
                      border: "1px solid hsl(220, 13%, 18%)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "white",
                    }}
                  />
                  {latencyData.map((s) => (
                    <Area
                      key={s.label}
                      type="monotone"
                      dataKey={s.label}
                      stroke={s.color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${s.label})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI actions */}
          <div className="col-span-1 rounded-lg border border-[hsl(220,13%,15%)] bg-[hsl(220,13%,10%)] p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-white">AI actions</p>
              <Link
                href="/dashboard/insights"
                className="text-[10px] text-[hsl(220,10%,40%)] hover:text-[hsl(220,10%,60%)]"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded bg-[hsl(220,13%,12%)]" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {actions.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-[hsl(220,13%,12%)]"
                  >
                    <span className="mt-0.5 text-[hsl(220,10%,45%)]">
                      {aiActionIcon(a.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[hsl(220,10%,75%)]">
                        {a.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[hsl(220,10%,38%)]">
                        {a.serviceName} · {timeAgo(a.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Service health list ────────────────────────── */}
        <div className="rounded-lg border border-[hsl(220,13%,15%)] bg-[hsl(220,13%,10%)]">
          <div className="flex items-center justify-between border-b border-[hsl(220,13%,14%)] px-5 py-3.5">
            <p className="text-sm font-medium text-white">Services</p>
            <Link
              href="/dashboard/services"
              className="flex items-center gap-1 text-[10px] text-[hsl(220,10%,40%)] hover:text-[hsl(220,10%,60%)]"
            >
              All services <IconArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded bg-[hsl(220,13%,12%)]" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-[hsl(220,10%,40%)]">
              <IconServer className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-xs">No services yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(220,13%,13%)]">
              {services.map((svc) => (
                <Link
                  key={svc.id}
                  href={`/dashboard/services/${svc.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[hsl(220,13%,12%)]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[svc.status] }}
                  />
                  <span className="flex-1 text-sm text-[hsl(220,10%,75%)]">
                    {svc.name}
                  </span>
                  <div className="flex items-center gap-4 text-[11px] text-[hsl(220,10%,40%)]">
                    {svc.status !== "unknown" && (
                      <>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3 w-3" />
                          {svc.avgLatency}ms
                        </span>
                        <span>{svc.uptime.toFixed(1)}%</span>
                      </>
                    )}
                    <span style={{ color: STATUS_COLOR[svc.status] }}>
                      {svc.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

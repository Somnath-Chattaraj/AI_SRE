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
  IconBolt,
  IconTrendingUp,
  IconHeartbeat,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import {
  fetchRealServices,
  fetchRealMetrics,
  fetchRealAIActions,
  type ServiceMetrics,
  type AIAction,
} from "@/lib/api-client";

interface DashboardStats {
  totalServices: number;
  avgUptime: number;
  avgLatency: number;
  avgErrorRate: number;
  activeIncidents: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}

interface LatencySeries {
  label: string;
  color: string;
  data: { timestamp: string; value: number }[];
}
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
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";

const STATUS_CODE: Record<string, { code: string; bg: string; text: string; dot: string }> = {
  healthy: {
    code: "Healthy",
    bg: "rgba(52, 211, 153, 0.1)",
    text: "#34d399",
    dot: "#34d399",
  },
  warning: {
    code: "Warning",
    bg: "rgba(251, 191, 36, 0.1)",
    text: "#fbbf24",
    dot: "#fbbf24",
  },
  critical: {
    code: "Critical",
    bg: "rgba(248, 113, 113, 0.1)",
    text: "#f87171",
    dot: "#f87171",
  },
  unknown: {
    code: "Offline",
    bg: "rgba(82, 82, 91, 0.15)",
    text: "#52525b",
    dot: "#52525b",
  },
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
  const cls = "h-4 w-4";
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
  const [latencyData, setLatencyData] = useState<LatencySeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const [raw, actionsData] = await Promise.all([
        fetchRealServices(),
        fetchRealAIActions(),
      ]);
      setActions(actionsData);

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

      const colors = ["#818cf8", "#6366f1", "#a5b4fc", "#a1a1aa"];
      const series: LatencySeries[] = metricsList
        .map((m, i) => {
          if (m.status !== "fulfilled") return null;
          const ts = m.value.timeSeries?.latency;
          if (!ts || ts.length === 0) return null;
          return {
            label: raw[i].name,
            color: colors[i % colors.length],
            data: ts,
          };
        })
        .filter((s): s is LatencySeries => s !== null);
      setLatencyData(series);

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
      // Backend not reachable
    }

    setLoading(false);
  }

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
        title="Overview"
        subtitle="Real-time monitoring"
      />

      <section className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* ── Stats Row with MagicCard ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Services Count */}
          <MagicCard
            className="rounded-xl"
            gradientFrom="#818cf8"
            gradientTo="#6366f1"
            gradientColor="#1a1a2e"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#52525b]">Services</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#818cf8]/10">
                  <IconServer className="h-4 w-4 text-[#818cf8]" />
                </div>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                {loading ? (
                  <span className="inline-block h-7 w-14 animate-pulse rounded bg-[#18181b]" />
                ) : (
                  <NumberTicker value={stats?.totalServices ?? 0} />
                )}
              </span>
              {!loading && (
                <p className="text-xs text-[#34d399] mt-1 flex items-center gap-1">
                  <IconTrendingUp className="h-3 w-3" />
                  {stats?.healthyCount ?? 0} healthy
                </p>
              )}
            </div>
          </MagicCard>

          {/* Avg Uptime */}
          <MagicCard
            className="rounded-xl"
            gradientFrom="#34d399"
            gradientTo="#059669"
            gradientColor="#0a1f1a"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#52525b]">Avg Uptime</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34d399]/10">
                  <IconHeartbeat className="h-4 w-4 text-[#34d399]" />
                </div>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {loading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-[#18181b]" />
                  ) : (
                    <NumberTicker value={stats?.avgUptime ?? 0} decimalPlaces={2} />
                  )}
                </span>
                {!loading && <span className="text-sm text-[#a1a1aa]">%</span>}
              </div>
              <div className="mt-3 h-1 w-full bg-[#18181b] overflow-hidden rounded-full">
                <div
                  className="h-full bg-[#34d399] rounded-full transition-all duration-700"
                  style={{ width: loading ? '0%' : `${Math.min(stats?.avgUptime ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </MagicCard>

          {/* Avg Latency */}
          <MagicCard
            className="rounded-xl"
            gradientFrom="#60a5fa"
            gradientTo="#3b82f6"
            gradientColor="#0a1628"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#52525b]">Avg Latency</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#60a5fa]/10">
                  <IconClock className="h-4 w-4 text-[#60a5fa]" />
                </div>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {loading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-[#18181b]" />
                  ) : (
                    <NumberTicker value={stats?.avgLatency ?? 0} />
                  )}
                </span>
                {!loading && <span className="text-sm text-[#a1a1aa]">ms</span>}
              </div>
              {!loading && (
                <p className="text-xs text-[#a1a1aa] mt-1">within threshold</p>
              )}
            </div>
          </MagicCard>

          {/* Critical Issues */}
          <MagicCard
            className="rounded-xl"
            gradientFrom="#f87171"
            gradientTo="#ef4444"
            gradientColor="#1f0a0a"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#52525b]">Critical</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f87171]/10">
                  <IconAlertTriangle className="h-4 w-4 text-[#f87171]" />
                </div>
              </div>
              <span className={`text-2xl font-bold tracking-tight ${(stats?.criticalCount ?? 0) > 0 ? 'text-[#f87171]' : 'text-white'}`}>
                {loading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-[#18181b]" />
                ) : (
                  <NumberTicker value={stats?.criticalCount ?? 0} />
                )}
              </span>
              {!loading && (
                <p className={`text-xs mt-1 ${(stats?.criticalCount ?? 0) > 0 ? 'text-[#f87171]/70' : 'text-[#34d399]'}`}>
                  {(stats?.criticalCount ?? 0) > 0 ? "needs attention" : "all clear"}
                </p>
              )}
            </div>
          </MagicCard>
        </div>

        {/* ── Charts + AI Activity ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Performance Chart with BorderBeam */}
          <div
            className="lg:col-span-2 relative rounded-xl bg-[#111113] p-6 overflow-hidden"
            style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <BorderBeam
              size={200}
              duration={8}
              colorFrom="#818cf8"
              colorTo="#6366f1"
              borderWidth={1}
            />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-semibold text-white">Network Performance</h3>
                <p className="text-xs text-[#52525b] mt-1">Latency over time</p>
              </div>
              <div className="flex gap-4">
                {latencyData.slice(0, 2).map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#818cf8', opacity: i === 0 ? 1 : 0.4 }}
                    />
                    <span className="text-[11px] text-[#71717a]">
                      {s.label.length > 12 ? s.label.substring(0, 12) : s.label}
                    </span>
                  </div>
                ))}
                {latencyData.length === 0 && !loading && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
                      <span className="text-[11px] text-[#71717a]">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#818cf8]/40" />
                      <span className="text-[11px] text-[#71717a]">Secondary</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-[260px] rounded-lg bg-[#18181b]" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
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
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3"
                    stroke="rgba(255, 255, 255, 0.04)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#fafafa",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                    }}
                  />
                  {latencyData.map((s, i) => (
                    <Area
                      key={s.label}
                      type="monotone"
                      dataKey={s.label}
                      stroke="#818cf8"
                      strokeWidth={2}
                      strokeOpacity={i === 0 ? 1 : 0.4}
                      fill={`url(#grad-${s.label})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Activity */}
          <div
            className="rounded-xl bg-[#111113] p-6 flex flex-col"
            style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-semibold text-white">AI Activity</h3>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#818cf8]/10">
                <IconBolt className="h-3.5 w-3.5 text-[#818cf8]" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3 flex-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg bg-[#18181b]" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {actions.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex gap-3 group">
                    <div className="mt-0.5">
                      <div className="w-7 h-7 rounded-lg bg-[#818cf8]/10 flex items-center justify-center text-[#818cf8]">
                        {aiActionIcon(a.type)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#e4e4e7] line-clamp-2 leading-relaxed">
                        {a.message}
                      </p>
                      <span className="text-[10px] text-[#52525b] mt-1 block">
                        {a.serviceName} · {timeAgo(a.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/insights"
              className="w-full mt-4 py-2.5 text-center text-xs font-medium text-[#71717a] hover:text-[#818cf8] transition-all rounded-lg block hover:bg-[#818cf8]/5"
              style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              View all activity
              <IconArrowRight className="inline h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* ── Service Registry ─────────────────────────────── */}
        <div
          className="rounded-xl bg-[#111113] overflow-hidden"
          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div
            className="p-5 flex justify-between items-center"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <h3 className="text-sm font-semibold text-white">Services</h3>
            <Link
              href="/dashboard/services"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717a] hover:text-white transition-colors hover:bg-[#18181b]"
            >
              View all
              <IconArrowRight className="inline h-3 w-3 ml-1" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-[#18181b]" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#52525b]">
              <IconServer className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-sm">No services registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-medium text-[#52525b]"
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <th className="px-6 py-3 font-medium">Service</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Uptime</th>
                    <th className="px-6 py-3 font-medium text-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => {
                    const sc = STATUS_CODE[svc.status] || STATUS_CODE.unknown;
                    return (
                      <tr
                        key={svc.id}
                        className="hover:bg-[#18181b]/50 transition-colors cursor-pointer group"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}
                        onClick={() => window.location.href = `/dashboard/services/${svc.id}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[#e4e4e7] group-hover:text-white transition-colors">
                            {svc.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                            <span className="text-xs" style={{ color: sc.text }}>{sc.code}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1 bg-[#18181b] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(Math.round(svc.uptime), 100)}%`,
                                  backgroundColor: sc.dot,
                                }}
                              />
                            </div>
                            <span className="text-xs text-[#a1a1aa] font-mono">
                              {svc.uptime.toFixed(svc.uptime >= 99.9 ? 3 : 1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-[#a1a1aa] font-mono">{svc.avgLatency}ms</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

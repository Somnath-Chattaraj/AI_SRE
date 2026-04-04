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

/* ── Status codes for Kinetic Engineering ────────────────── */
const STATUS_CODE: Record<string, { code: string; bg: string; text: string; dot: string; dotShadow: string }> = {
  healthy: {
    code: "SYS_OK",
    bg: "rgba(255, 183, 123, 0.1)",
    text: "#ffb77b",
    dot: "#ffb77b",
    dotShadow: "0 0 8px rgba(255,183,123,0.4)",
  },
  warning: {
    code: "STBL_WRN",
    bg: "rgba(65, 58, 54, 1)",
    text: "#c8bdb7",
    dot: "#a69c96",
    dotShadow: "0 0 8px rgba(166,156,150,0.4)",
  },
  critical: {
    code: "ERR_911",
    bg: "rgba(237, 127, 100, 0.1)",
    text: "#ed7f64",
    dot: "#ed7f64",
    dotShadow: "0 0 8px rgba(237,127,100,0.4)",
  },
  unknown: {
    code: "OFFLINE",
    bg: "rgba(72, 72, 72, 0.2)",
    text: "#767575",
    dot: "#767575",
    dotShadow: "none",
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

      // Build latency series from first service with timeSeries data
      const colors = ["#ffb77b", "#f6a762", "#ead1a3", "#a69c96"];
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
        title="Command Center"
        subtitle="Real-time monitoring overview"
      />

      <section className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* ── Kinetic Stats Row ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Services Count */}
          <div
            className="bg-[#131313] p-5 hover:border-l-[#ffb77b]/40 transition-all group"
            style={{ borderLeft: '2px solid rgba(72, 72, 72, 0.1)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(255,183,123,0.4)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(72, 72, 72, 0.1)')}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#acabaa]/50">
              Services Count
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-[#e7e5e4] tracking-tight">
                {loading ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded bg-[#1f2020]" />
                ) : (
                  stats?.totalServices ?? 0
                )}
              </span>
              {!loading && (
                <span className="text-xs text-[#ffb77b]/80">
                  +{stats?.healthyCount ?? 0} stable
                </span>
              )}
            </div>
            <div className="mt-4 h-1 w-full bg-[#252626] overflow-hidden rounded-full">
              <div
                className="h-full bg-[#ffb77b]/20 transition-all"
                style={{ width: loading ? '0%' : '75%' }}
              />
            </div>
          </div>

          {/* Avg Uptime */}
          <div
            className="bg-[#131313] p-5 transition-all group"
            style={{ borderLeft: '2px solid rgba(72, 72, 72, 0.1)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(255,183,123,0.4)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(72, 72, 72, 0.1)')}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#acabaa]/50">
              Avg Uptime
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-[#e7e5e4] tracking-tight">
                {loading ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded bg-[#1f2020]" />
                ) : (
                  `${stats?.avgUptime ?? 0}%`
                )}
              </span>
              {!loading && (
                <span className="text-xs text-[#ffb77b]/80">SYS_OK</span>
              )}
            </div>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 ${i <= 3 ? 'bg-[#ffb77b]' : 'bg-[#ffb77b]/20'}`}
                />
              ))}
            </div>
          </div>

          {/* Avg Latency */}
          <div
            className="bg-[#131313] p-5 transition-all group"
            style={{ borderLeft: '2px solid rgba(72, 72, 72, 0.1)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(255,183,123,0.4)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(72, 72, 72, 0.1)')}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#acabaa]/50">
              Avg Latency
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-[#e7e5e4] tracking-tight">
                {loading ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded bg-[#1f2020]" />
                ) : (
                  `${stats?.avgLatency ?? 0}ms`
                )}
              </span>
              {!loading && (
                <span className="text-xs text-[#acabaa]">-4ms shift</span>
              )}
            </div>
            {/* Mini sparkline bars */}
            <div className="mt-4 flex items-end gap-[2px] h-4 opacity-30">
              {[2, 3, 2, 4, 2, 3, 1, 3, 2, 4, 3, 2].map((h, i) => (
                <div key={i} className="bg-[#ffb77b] w-1" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
          </div>

          {/* Critical Issues */}
          <div
            className="bg-[#131313] p-5 transition-all group"
            style={{ borderLeft: '2px solid rgba(237, 127, 100, 0.2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderLeft = '2px solid #ed7f64')}
            onMouseLeave={(e) => (e.currentTarget.style.borderLeft = '2px solid rgba(237, 127, 100, 0.2)')}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#ed7f64]/60">
              Critical Issues
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-[#ed7f64] tracking-tight">
                {loading ? (
                  <span className="inline-block h-8 w-10 animate-pulse rounded bg-[#1f2020]" />
                ) : (
                  String(stats?.criticalCount ?? 0).padStart(2, "0")
                )}
              </span>
              {!loading && (
                <span className="text-xs text-[#ed7f64]/80">
                  {(stats?.criticalCount ?? 0) > 0 ? "REQUIRING_HEAL" : "ALL_CLEAR"}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              {!loading && (stats?.criticalCount ?? 0) > 0 && (
                <span className="text-[10px] font-mono text-[#ed7f64]/40">
                  ERR_CODE: AH-402
                </span>
              )}
              {(stats?.criticalCount ?? 0) > 0 && (
                <IconAlertTriangle className="h-4 w-4 text-[#ed7f64]" />
              )}
            </div>
          </div>
        </div>

        {/* ── Charts + AI Interventions ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Network Performance Chart */}
          <div
            className="lg:col-span-2 bg-[#131313] p-8 rounded-lg overflow-hidden relative"
            style={{ border: '1px solid rgba(72, 72, 72, 0.05)' }}
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#e7e5e4]">
                  Network Performance
                </h3>
                <p className="text-xs text-[#acabaa] mt-1">
                  Real-time latency telemetry across global clusters
                </p>
              </div>
              <div className="flex gap-4">
                {latencyData.slice(0, 2).map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: i === 0 ? '#ffb77b' : 'rgba(255,183,123,0.2)' }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#acabaa]">
                      {s.label.length > 10 ? s.label.substring(0, 10) : s.label}
                    </span>
                  </div>
                ))}
                {latencyData.length === 0 && !loading && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ffb77b]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#acabaa]">US-EAST</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ffb77b]/20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#acabaa]">EU-WEST</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-[280px] rounded bg-[#1f2020]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
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
                        <stop offset="0%" stopColor="#ffb77b" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#ffb77b" stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4"
                    stroke="rgba(72, 72, 72, 0.3)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#767575", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#767575", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2020",
                      border: "1px solid rgba(72, 72, 72, 0.3)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#e7e5e4",
                    }}
                  />
                  {latencyData.map((s) => (
                    <Area
                      key={s.label}
                      type="monotone"
                      dataKey={s.label}
                      stroke="#ffb77b"
                      strokeWidth={2}
                      fill={`url(#grad-${s.label})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Interventions */}
          <div
            className="bg-[#131313] p-8 rounded-lg flex flex-col"
            style={{ border: '1px solid rgba(72, 72, 72, 0.05)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#ffb77b]">
                AI Interventions
              </h3>
              <IconBolt className="h-4 w-4 text-[#ffb77b]" />
            </div>
            {loading ? (
              <div className="space-y-4 flex-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded bg-[#1f2020]" />
                ))}
              </div>
            ) : (
              <div className="space-y-6 flex-1">
                {actions.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex gap-4 group">
                    <div className="mt-1">
                      <div className="w-8 h-8 rounded bg-[#ffb77b]/10 flex items-center justify-center text-[#ffb77b]">
                        {aiActionIcon(a.type)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#e7e5e4] truncate">
                        {a.message.split(':')[0] || a.message.substring(0, 30)}
                      </h4>
                      <p className="text-[11px] text-[#acabaa] mt-1 leading-relaxed line-clamp-2">
                        {a.message}
                      </p>
                      <span className="text-[9px] font-mono text-[#acabaa]/40 mt-2 block uppercase tracking-wider">
                        {a.serviceName} · {timeAgo(a.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/insights"
              className="w-full mt-6 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#acabaa] hover:text-[#ffb77b] transition-all block"
              style={{ border: '1px solid rgba(72, 72, 72, 0.3)' }}
            >
              View Complete Logs
            </Link>
          </div>
        </div>

        {/* ── System Registry ──────────────────────────────── */}
        <div
          className="bg-[#131313] rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(72, 72, 72, 0.05)' }}
        >
          <div
            className="p-6 flex justify-between items-center"
            style={{ borderBottom: '1px solid rgba(72, 72, 72, 0.1)' }}
          >
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#e7e5e4]">
              System Registry
            </h3>
            <div className="flex gap-2">
              <Link
                href="/dashboard/services"
                className="px-3 py-1 bg-[#1f2020] rounded text-[10px] font-bold uppercase text-[#acabaa] hover:text-[#e7e5e4] transition-colors"
                style={{ border: '1px solid rgba(72, 72, 72, 0.2)' }}
              >
                All
              </Link>
              <button className="px-3 py-1 text-[10px] font-bold uppercase text-[#acabaa] hover:text-[#e7e5e4] transition-colors">
                Core
              </button>
              <button className="px-3 py-1 text-[10px] font-bold uppercase text-[#acabaa] hover:text-[#e7e5e4] transition-colors">
                Edge
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded bg-[#1f2020]" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-[#767575]">
              <IconServer className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-xs">No services yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-[#acabaa]/40"
                    style={{ borderBottom: '1px solid rgba(72, 72, 72, 0.05)' }}
                  >
                    <th className="px-8 py-4">Service Name</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Efficiency</th>
                    <th className="px-8 py-4 text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(72, 72, 72, 0.05)' }}>
                  {services.map((svc) => {
                    const sc = STATUS_CODE[svc.status] || STATUS_CODE.unknown;
                    const efficiencyPercent = svc.uptime > 0
                      ? Math.min(Math.round(svc.uptime), 100)
                      : 0;
                    return (
                      <tr
                        key={svc.id}
                        className="hover:bg-[#1f2020] transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/dashboard/services/${svc.id}`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: sc.dot,
                                boxShadow: sc.dotShadow,
                                animation: svc.status === 'critical' ? 'pulse 2s infinite' : undefined,
                              }}
                            />
                            <span className="text-sm font-medium text-[#e7e5e4]">
                              {svc.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.text,
                            }}
                          >
                            {sc.code}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <span
                              className="text-xs font-mono"
                              style={{ color: svc.status === 'critical' ? '#ed7f64' : '#e7e5e4' }}
                            >
                              {efficiencyPercent}%
                            </span>
                            <div className="w-24 h-1 bg-[#252626] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${efficiencyPercent}%`,
                                  backgroundColor: svc.status === 'critical'
                                    ? '#ed7f64'
                                    : svc.status === 'warning'
                                      ? '#a69c96'
                                      : '#ffb77b',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-mono text-xs text-[#acabaa]">
                          {svc.uptime.toFixed(svc.uptime >= 99.9 ? 3 : 1)}%
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

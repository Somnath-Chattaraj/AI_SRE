"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconBrain,
  IconGitPullRequest,
  IconExternalLink,
  IconSparkles,
  IconCircleCheck,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import {
  fetchRealServices,
  fetchRealMetrics,
  fetchRealIncidents,
  fetchAnomalyLogs,
  type BackendService,
  type ServiceMetrics,
  type BackendIncident,
  type AnomalyLog,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = {
  healthy: "#34d399",
  warning: "#fbbf24",
  critical: "#f87171",
  unknown: "#52525b",
};

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<BackendService | null>(null);
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [incidents, setIncidents] = useState<BackendIncident[]>([]);
  const [anomalyLogs, setAnomalyLogs] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "incidents" | "fixes" | "anomaly-logs">("overview");

  useEffect(() => {
    async function load() {
      try {
        const [allServices, m, inc, logs] = await Promise.all([
          fetchRealServices(),
          fetchRealMetrics(serviceId),
          fetchRealIncidents(serviceId),
          fetchAnomalyLogs(serviceId),
        ]);
        const svc = allServices.find((s) => s.id === serviceId) ?? null;
        setService(svc);
        setMetrics(m);
        setIncidents(inc);
        setAnomalyLogs(logs);
      } catch {
        // leave nulls
      }
      setLoading(false);
    }
    load();
  }, [serviceId]);

  const prepareChartData = (ts: { timestamp: string; value: number }[]) =>
    ts
      .filter((_, i) => i % 8 === 0)
      .slice(-30)
      .map((p) => ({
        time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: p.value,
      }));

  if (loading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="p-6 space-y-6">
          <Skeleton className="h-[200px] rounded-xl bg-[#18181b]" />
          <Skeleton className="h-[300px] rounded-xl bg-[#18181b]" />
        </div>
      </>
    );
  }

  if (!service) {
    return (
      <>
        <TopBar title="Service Not Found" />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-white">Service not found</p>
          <Link href="/dashboard/services" className="mt-4 text-sm text-[#818cf8] hover:underline">
            Back to services
          </Link>
        </div>
      </>
    );
  }

  const prsWithUrl = incidents.filter((i) => i.prUrl);
  const svcStatus = metrics?.status ?? "unknown";

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "incidents" as const, label: `Incidents (${incidents.length})` },
    { id: "fixes" as const, label: `Fixes (${prsWithUrl.length})` },
    { id: "anomaly-logs" as const, label: `Anomaly Logs (${anomalyLogs.length})` },
  ];

  return (
    <>
      <TopBar title={service.name} subtitle={service.url_server} />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back + Status Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/services"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#18181b] text-[#71717a] transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <IconArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{service.name}</h2>
                  <Badge
                    className="border-transparent text-xs"
                    style={{
                      color: statusColors[svcStatus],
                      backgroundColor: `${statusColors[svcStatus]}15`,
                    }}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: statusColors[svcStatus] }}
                    />
                    {svcStatus.charAt(0).toUpperCase() + svcStatus.slice(1)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[#52525b]">{service.url_server}</p>
              </div>
            </div>

            <div className="hidden gap-6 lg:flex">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{metrics?.uptime?.toFixed(1) ?? "—"}%</p>
                <p className="text-[10px] text-[#52525b]">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{metrics?.avgLatency ?? "—"}ms</p>
                <p className="text-[10px] text-[#52525b]">Latency</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-[#0c0c0e] p-1" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-[#52525b] hover:text-white"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="service-tab"
                    className="absolute inset-0 rounded-md bg-[#18181b]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {metrics?.timeSeries?.latency && metrics.timeSeries.latency.length > 0 && (
                  <ChartPanel
                    title="Latency"
                    unit="ms"
                    data={prepareChartData(metrics.timeSeries.latency)}
                    color="#818cf8"
                  />
                )}
                {metrics?.timeSeries?.uptime && metrics.timeSeries.uptime.length > 0 && (
                  <ChartPanel
                    title="Uptime"
                    unit="%"
                    data={prepareChartData(metrics.timeSeries.uptime)}
                    color="#34d399"
                  />
                )}
              </div>

              {incidents.length > 0 && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(129, 140, 248, 0.05)', border: '1px solid rgba(129, 140, 248, 0.12)' }}>
                  <div className="mb-4 flex items-center gap-2">
                    <IconBrain className="h-5 w-5 text-[#818cf8]" />
                    <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
                    <Badge className="bg-[#818cf8]/10 text-[#a5b4fc] border-transparent text-[10px]">
                      <IconSparkles className="mr-1 h-3 w-3" />
                      Live
                    </Badge>
                  </div>
                  {incidents.filter((i) => i.aiAnalysis).slice(0, 1).map((inc) => (
                    <div key={inc.id} className="space-y-3">
                      <p className="text-sm leading-relaxed text-[#a1a1aa]">{inc.aiAnalysis}</p>
                      {inc.rootCause && (
                        <div className="rounded-lg bg-[#09090b] p-3">
                          <p className="text-[10px] font-semibold uppercase text-[#f87171]">Root Cause</p>
                          <p className="mt-1 font-mono text-xs text-[#a1a1aa]">{inc.rootCause}</p>
                        </div>
                      )}
                      {inc.confidence && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#52525b]">Confidence:</span>
                          <div className="h-1.5 w-24 rounded-full bg-[#18181b]">
                            <div className="h-full rounded-full bg-[#818cf8]" style={{ width: `${inc.confidence}%` }} />
                          </div>
                          <span className="text-xs font-medium text-[#a5b4fc]">{inc.confidence}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#52525b]">
                  <IconCircleCheck className="mb-2 h-10 w-10 text-[#34d399]" />
                  <p className="text-sm text-white">No incidents — all clear!</p>
                </div>
              ) : (
                incidents.map((inc) => <IncidentCard key={inc.id} incident={inc} />)
              )}
            </div>
          )}

          {activeTab === "fixes" && (
            <div className="space-y-4">
              {prsWithUrl.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#52525b]">
                  <IconGitPullRequest className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm text-white">No fixes generated yet</p>
                </div>
              ) : (
                prsWithUrl.map((inc) => <FixCard key={inc.id} incident={inc} />)
              )}
            </div>
          )}

          {activeTab === "anomaly-logs" && (
            <div className="space-y-3">
              {anomalyLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#52525b]">
                  <IconAlertTriangle className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm text-white">No anomaly logs yet</p>
                </div>
              ) : (
                anomalyLogs.map((log) => <AnomalyLogCard key={log.id} log={log} />)
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

function ChartPanel({
  title, unit, data, color,
}: {
  title: string; unit: string; data: { time: string; value: number }[]; color: string;
}) {
  return (
    <div className="rounded-xl bg-[#111113] p-4" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <h4 className="mb-3 text-xs font-semibold text-[#71717a]">{title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#52525b", fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#52525b", fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "white",
            }}
            formatter={(v: number | string) => [`${v}${unit}`, title]}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${title})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function IncidentCard({ incident }: { incident: BackendIncident }) {
  const severityColors: Record<string, string> = {
    low: "#60a5fa",
    medium: "#fbbf24",
    high: "#f87171",
    critical: "#ef4444",
  };

  return (
    <div className="rounded-xl bg-[#111113] p-5" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconAlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: severityColors[incident.severity] }}
          />
          <div>
            <h4 className="text-sm font-semibold text-white">{incident.title}</h4>
            <p className="mt-1 text-xs text-[#71717a]">{incident.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className="border-transparent text-[10px]"
            style={{
              color: severityColors[incident.severity],
              backgroundColor: `${severityColors[incident.severity]}15`,
            }}
          >
            {incident.severity}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              incident.status === "resolved"
                ? "border-[#34d399]/20 text-[#34d399]"
                : "border-[#fbbf24]/20 text-[#fbbf24]"
            }`}
          >
            {incident.status}
          </Badge>
        </div>
      </div>
      {incident.aiAnalysis && (
        <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(129, 140, 248, 0.05)', border: '1px solid rgba(129, 140, 248, 0.1)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <IconBrain className="h-3.5 w-3.5 text-[#818cf8]" />
            <span className="text-[10px] font-semibold text-[#a5b4fc]">AI Analysis</span>
          </div>
          <p className="text-xs leading-relaxed text-[#a1a1aa]">{incident.aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}

function FixCard({ incident }: { incident: BackendIncident }) {
  const statusColor =
    incident.status === "resolved" ? "#34d399"
      : incident.status === "failed" ? "#f87171"
      : "#818cf8";

  return (
    <div className="rounded-xl bg-[#111113] p-5" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconGitPullRequest className="mt-0.5 h-5 w-5 shrink-0" style={{ color: statusColor }} />
          <div>
            <h4 className="text-sm font-semibold text-white">{incident.title}</h4>
            {incident.patchedAt && (
              <p className="mt-0.5 text-[10px] text-[#52525b]">
                Patched {new Date(incident.patchedAt).toLocaleString()}
                {incident.patchModel && ` · ${incident.patchModel}`}
              </p>
            )}
          </div>
        </div>
        <Badge className="border-transparent text-[10px] shrink-0" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>
          {incident.status}
        </Badge>
      </div>

      {incident.patchAnalysis && (
        <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(129, 140, 248, 0.05)', border: '1px solid rgba(129, 140, 248, 0.1)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <IconBrain className="h-3.5 w-3.5 text-[#818cf8]" />
            <span className="text-[10px] font-semibold text-[#a5b4fc]">Patch Analysis</span>
          </div>
          <p className="text-xs leading-relaxed text-[#a1a1aa]">{incident.patchAnalysis}</p>
        </div>
      )}

      {incident.patches && incident.patches.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase text-[#52525b]">
            Files Changed ({incident.patches.length})
          </p>
          <div className="space-y-1">
            {incident.patches.map((p, i) => (
              <div key={i} className="rounded-md bg-[#0c0c0e] px-3 py-2">
                <p className="font-mono text-[11px] text-[#60a5fa]">{p.filePath}</p>
                <p className="mt-0.5 text-[10px] text-[#52525b]">{p.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {incident.prUrl && (
        <div className="mt-3">
          <a href={incident.prUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#818cf8] hover:underline">
            <IconExternalLink className="h-3 w-3" />
            View Pull Request on GitHub
          </a>
        </div>
      )}
    </div>
  );
}

function AnomalyLogCard({ log }: { log: AnomalyLog }) {
  const metricColors: Record<string, string> = {
    probe_success: "#f87171",
    probe_duration_seconds: "#fbbf24",
    probe_http_status_code: "#60a5fa",
  };
  const color = metricColors[log.metric] ?? "#818cf8";
  const stats = log.raw_data?.stats;

  return (
    <div className="rounded-xl bg-[#111113] p-4" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-mono text-xs text-white">{log.metric}</span>
          {log.value !== null && (
            <span className="text-[11px] text-[#52525b]">
              = {log.metric === "probe_duration_seconds" ? `${(log.value * 1000).toFixed(0)}ms` : log.value}
            </span>
          )}
        </div>
        <span className="text-[10px] text-[#52525b]">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      </div>
      {stats && (
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#71717a]">
          {stats.mean !== undefined && <span>mean: {(stats.mean * 1000).toFixed(0)}ms</span>}
          {stats.stddev !== undefined && <span>σ: {(stats.stddev * 1000).toFixed(0)}ms</span>}
          {stats.zScore !== undefined && <span>z-score: {stats.zScore.toFixed(2)}σ</span>}
          {stats.latestValue !== undefined && <span>latest: {(stats.latestValue * 1000).toFixed(0)}ms</span>}
        </div>
      )}
    </div>
  );
}

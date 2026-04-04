"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  IconArrowLeft,
  IconClock,
  IconActivity,
  IconAlertTriangle,
  IconBrain,
  IconGitPullRequest,
  IconExternalLink,
  IconSparkles,
  IconCircleCheck,
  IconFilter,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import {
  fetchService,
  fetchServiceMetrics,
  fetchIncidentsByService,
  fetchPullRequestsByService,
  fetchServiceLogs,
} from "@/lib/mock-api";
import type { Service, Incident, PullRequest, LogEntry, TimeSeriesData } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = {
  healthy: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  critical: "hsl(0, 72%, 51%)",
  unknown: "hsl(220, 10%, 45%)",
};

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [metrics, setMetrics] = useState<{ latency: TimeSeriesData; errorRate: TimeSeriesData; successRate: TimeSeriesData } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "incidents" | "fixes">("overview");
  const [logFilter, setLogFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const [svc, m, inc, pr, lg] = await Promise.all([
        fetchService(serviceId),
        fetchServiceMetrics(serviceId),
        fetchIncidentsByService(serviceId),
        fetchPullRequestsByService(serviceId),
        fetchServiceLogs(serviceId),
      ]);
      setService(svc ?? null);
      setMetrics(m);
      setIncidents(inc);
      setPrs(pr);
      setLogs(lg);
      setLoading(false);
    }
    load();
  }, [serviceId]);

  const filteredLogs = logFilter === "all"
    ? logs
    : logs.filter((l) => l.level === logFilter);

  const prepareChartData = (ts: TimeSeriesData) =>
    ts.data
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
          <Skeleton className="h-[200px] rounded-xl bg-[hsl(225,15%,12%)]" />
          <Skeleton className="h-[300px] rounded-xl bg-[hsl(225,15%,12%)]" />
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
          <Link href="/dashboard/services" className="mt-4 text-sm text-[hsl(265,90%,70%)] hover:underline">
            ← Back to services
          </Link>
        </div>
      </>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "logs" as const, label: "Logs" },
    { id: "incidents" as const, label: `Incidents (${incidents.length})` },
    { id: "fixes" as const, label: `Fixes (${prs.length})` },
  ];

  return (
    <>
      <TopBar
        title={service.name}
        subtitle={service.endpoint}
      />

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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(220,14%,18%)] bg-[hsl(220,14%,12%)] text-[hsl(220,10%,55%)] transition-colors hover:text-white"
              >
                <IconArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{service.name}</h2>
                  <Badge
                    className="border-transparent text-xs"
                    style={{
                      color: statusColors[service.status],
                      backgroundColor: `${statusColors[service.status]}15`,
                    }}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: statusColors[service.status] }}
                    />
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[hsl(220,10%,45%)]">{service.description}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden gap-6 lg:flex">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{service.uptime}%</p>
                <p className="text-[10px] text-[hsl(220,10%,45%)]">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{service.avgLatency}ms</p>
                <p className="text-[10px] text-[hsl(220,10%,45%)]">Latency</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{service.errorRate}%</p>
                <p className="text-[10px] text-[hsl(220,10%,45%)]">Error Rate</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,9%)] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-[hsl(220,10%,50%)] hover:text-white"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="service-tab"
                    className="absolute inset-0 rounded-md bg-[hsl(220,14%,14%)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && metrics && (
            <div className="space-y-6">
              {/* Charts Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartPanel
                  title="Latency"
                  unit="ms"
                  data={prepareChartData(metrics.latency)}
                  color={metrics.latency.color}
                />
                <ChartPanel
                  title="Error Rate"
                  unit="%"
                  data={prepareChartData(metrics.errorRate)}
                  color="hsl(0, 72%, 55%)"
                />
                <ChartPanel
                  title="Success Rate"
                  unit="%"
                  data={prepareChartData(metrics.successRate)}
                  color="hsl(142, 71%, 50%)"
                />
              </div>

              {/* AI Analysis */}
              {incidents.length > 0 && (
                <div className="rounded-xl border border-[hsl(265,90%,65%)/20%] bg-[hsl(265,90%,65%)/5%] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <IconBrain className="h-5 w-5 text-[hsl(265,90%,70%)]" />
                    <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
                    <Badge className="bg-[hsl(265,90%,65%)/15%] text-[hsl(265,90%,75%)] border-transparent text-[10px]">
                      <IconSparkles className="mr-1 h-3 w-3" />
                      Live
                    </Badge>
                  </div>
                  {incidents.filter((i) => i.aiAnalysis).slice(0, 1).map((inc) => (
                    <div key={inc.id} className="space-y-3">
                      <p className="text-sm leading-relaxed text-[hsl(220,10%,75%)]">
                        {inc.aiAnalysis}
                      </p>
                      {inc.rootCause && (
                        <div className="rounded-lg bg-[hsl(220,14%,10%)] p-3">
                          <p className="text-[10px] font-semibold uppercase text-[hsl(0,72%,60%)]">Root Cause</p>
                          <p className="mt-1 font-mono text-xs text-[hsl(220,10%,70%)]">{inc.rootCause}</p>
                        </div>
                      )}
                      {inc.confidence && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[hsl(220,10%,50%)]">Confidence:</span>
                          <div className="h-1.5 w-24 rounded-full bg-[hsl(220,14%,16%)]">
                            <div
                              className="h-full rounded-full bg-[hsl(265,90%,65%)]"
                              style={{ width: `${inc.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[hsl(265,90%,75%)]">
                            {inc.confidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-4">
              {/* Log Filters */}
              <div className="flex items-center gap-2">
                <IconFilter className="h-4 w-4 text-[hsl(220,10%,45%)]" />
                {["all", "info", "warn", "error", "debug"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      logFilter === level
                        ? "bg-[hsl(220,14%,16%)] text-white"
                        : "text-[hsl(220,10%,45%)] hover:text-white"
                    }`}
                  >
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Log List */}
              <div className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,9%)] overflow-hidden">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 border-b border-[hsl(220,14%,14%)] px-4 py-2.5 font-mono text-xs last:border-0 hover:bg-[hsl(220,14%,11%)]"
                  >
                    <span className="shrink-0 text-[hsl(220,10%,35%)] w-[140px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <LogLevelBadge level={log.level} />
                    <span className="text-[hsl(220,10%,70%)]">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[hsl(220,10%,45%)]">
                  <IconCircleCheck className="mb-2 h-10 w-10 text-[hsl(142,71%,50%)]" />
                  <p className="text-sm text-white">No incidents — all clear!</p>
                </div>
              ) : (
                incidents.map((inc) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))
              )}
            </div>
          )}

          {activeTab === "fixes" && (
            <div className="space-y-4">
              {prs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[hsl(220,10%,45%)]">
                  <IconGitPullRequest className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm text-white">No fixes generated yet</p>
                </div>
              ) : (
                prs.map((pr) => <PRCard key={pr.id} pr={pr} />)
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ChartPanel({
  title,
  unit,
  data,
  color,
}: {
  title: string;
  unit: string;
  data: { time: string; value: number }[];
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-4">
      <h4 className="mb-3 text-xs font-semibold text-[hsl(220,10%,55%)]">{title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "hsl(220, 10%, 40%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(220, 10%, 40%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(225, 18%, 12%)",
              border: "1px solid hsl(220, 14%, 20%)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "white",
            }}
            formatter={(v: any) => [`${v}${unit}`, title]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#grad-${title})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    info: { color: "hsl(199, 89%, 55%)", bg: "hsl(199, 89%, 48%)" },
    warn: { color: "hsl(38, 92%, 55%)", bg: "hsl(38, 92%, 50%)" },
    error: { color: "hsl(0, 72%, 60%)", bg: "hsl(0, 72%, 51%)" },
    debug: { color: "hsl(220, 10%, 55%)", bg: "hsl(220, 10%, 45%)" },
  };
  const c = config[level] || config.debug;
  return (
    <span
      className="inline-flex w-[52px] shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
      style={{ color: c.color, backgroundColor: `${c.bg}15` }}
    >
      {level}
    </span>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const severityColors: Record<string, string> = {
    low: "hsl(199, 89%, 55%)",
    medium: "hsl(38, 92%, 55%)",
    high: "hsl(0, 72%, 60%)",
    critical: "hsl(0, 72%, 51%)",
  };

  return (
    <div className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconAlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: severityColors[incident.severity] }}
          />
          <div>
            <h4 className="text-sm font-semibold text-white">{incident.title}</h4>
            <p className="mt-1 text-xs text-[hsl(220,10%,55%)]">{incident.description}</p>
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
                ? "border-[hsl(142,71%,45%)/30%] text-[hsl(142,71%,55%)]"
                : "border-[hsl(38,92%,50%)/30%] text-[hsl(38,92%,55%)]"
            }`}
          >
            {incident.status}
          </Badge>
        </div>
      </div>
      {incident.aiAnalysis && (
        <div className="mt-4 rounded-lg border border-[hsl(265,90%,65%)/15%] bg-[hsl(265,90%,65%)/5%] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <IconBrain className="h-3.5 w-3.5 text-[hsl(265,90%,70%)]" />
            <span className="text-[10px] font-semibold text-[hsl(265,90%,75%)]">AI Analysis</span>
          </div>
          <p className="text-xs leading-relaxed text-[hsl(220,10%,70%)]">{incident.aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}

function PRCard({ pr }: { pr: PullRequest }) {
  const statusColors: Record<string, string> = {
    pending: "hsl(38, 92%, 55%)",
    merged: "hsl(142, 71%, 55%)",
    failed: "hsl(0, 72%, 60%)",
    reviewing: "hsl(265, 90%, 70%)",
  };

  return (
    <div className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconGitPullRequest
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: statusColors[pr.status] }}
          />
          <div>
            <h4 className="text-sm font-semibold text-white">{pr.title}</h4>
            <p className="mt-1 text-xs text-[hsl(220,10%,55%)]">{pr.description}</p>
          </div>
        </div>
        <Badge
          className="border-transparent text-[10px] shrink-0"
          style={{
            color: statusColors[pr.status],
            backgroundColor: `${statusColors[pr.status]}15`,
          }}
        >
          {pr.status}
        </Badge>
      </div>

      {/* Diff Preview */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[hsl(220,14%,16%)] bg-[hsl(222,14%,7%)]">
        <div className="border-b border-[hsl(220,14%,14%)] px-3 py-1.5 text-[10px] text-[hsl(220,10%,45%)]">
          {pr.filesChanged} files · +{pr.additions} / -{pr.deletions}
        </div>
        <pre className="max-h-[200px] overflow-auto p-0 text-xs">
          {pr.diff.split("\n").map((line, i) => (
            <div
              key={i}
              className={`diff-line ${
                line.startsWith("+") && !line.startsWith("+++")
                  ? "diff-add"
                  : line.startsWith("-") && !line.startsWith("---")
                    ? "diff-remove"
                    : ""
              }`}
            >
              {line}
            </div>
          ))}
        </pre>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <a
          href={pr.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[hsl(265,90%,70%)] hover:underline"
        >
          <IconExternalLink className="h-3 w-3" />
          View on GitHub
        </a>
      </div>
    </div>
  );
}

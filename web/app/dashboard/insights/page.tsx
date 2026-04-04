"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconBrain,
  IconSparkles,
  IconAlertTriangle,
  IconBug,
  IconShieldCheck,
  IconArrowRight,
  IconTarget,
  IconChartBar,
  IconCode,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import { fetchRealIncidents, fetchRealAIActions, type BackendIncident, type AIAction } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function InsightsPage() {
  const [incidents, setIncidents] = useState<BackendIncident[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [inc, act] = await Promise.all([fetchRealIncidents(), fetchRealAIActions()]);
      setIncidents(inc);
      setActions(act);
      setLoading(false);
    }
    load();
  }, []);

  const severityColors: Record<string, { color: string; bg: string }> = {
    low: { color: "#60a5fa", bg: "#60a5fa" },
    medium: { color: "#fbbf24", bg: "#fbbf24" },
    high: { color: "#f87171", bg: "#f87171" },
    critical: { color: "#ef4444", bg: "#ef4444" },
  };

  const actionIcon = (type: string) => {
    switch (type) {
      case "bug_detected":
        return <IconBug className="h-4 w-4 text-[#f87171]" />;
      case "anomaly_detected":
        return <IconAlertTriangle className="h-4 w-4 text-[#fbbf24]" />;
      case "fix_generated":
        return <IconSparkles className="h-4 w-4 text-[#60a5fa]" />;
      case "pr_created":
        return <IconShieldCheck className="h-4 w-4 text-[#818cf8]" />;
      case "auto_resolved":
        return <IconShieldCheck className="h-4 w-4 text-[#34d399]" />;
      default:
        return <IconBrain className="h-4 w-4 text-[#818cf8]" />;
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      <TopBar
        title="Insights"
        subtitle="Anomaly detection and root cause analysis"
      />

      <div className="p-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[100px] rounded-xl bg-[#18181b]" />
              ))
            ) : (
              <>
                <motion.div variants={item}>
                  <InsightCard
                    label="Total Anomalies"
                    value={incidents.length.toString()}
                    icon={<IconTarget className="h-5 w-5" />}
                    color="#818cf8"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="Critical Issues"
                    value={incidents.filter((i) => i.severity === "critical").length.toString()}
                    icon={<IconAlertTriangle className="h-5 w-5" />}
                    color="#f87171"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="Auto-Resolved"
                    value={incidents.filter((i) => i.status === "resolved").length.toString()}
                    icon={<IconShieldCheck className="h-5 w-5" />}
                    color="#34d399"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="AI Actions Today"
                    value={actions.length.toString()}
                    icon={<IconChartBar className="h-5 w-5" />}
                    color="#60a5fa"
                  />
                </motion.div>
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* AI Actions Timeline */}
            <motion.div
              variants={item}
              className="rounded-xl bg-[#111113] p-5 lg:col-span-1"
              style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <div className="mb-4 flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-[#818cf8]" />
                <h3 className="text-sm font-semibold text-white">AI Activity Timeline</h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg bg-[#18181b]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {actions.map((action, idx) => (
                    <div key={action.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#18181b]">
                          {actionIcon(action.type)}
                        </div>
                        {idx < actions.length - 1 && (
                          <div className="w-px flex-1 bg-[#27272a]" />
                        )}
                      </div>
                      <div className="pb-5 min-w-0">
                        <p className="text-xs text-[#d4d4d8] line-clamp-2">
                          {action.message}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#52525b]">
                          {action.serviceName} · {timeAgo(action.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Detected Anomalies */}
            <motion.div
              variants={item}
              className="space-y-4 lg:col-span-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Detected Anomalies & Analysis</h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[220px] rounded-xl bg-[#18181b]" />
                  ))}
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="rounded-xl bg-[#111113] p-5 transition-colors hover:bg-[#151517]"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${severityColors[inc.severity]?.bg ?? '#818cf8'}15` }}
                        >
                          <IconAlertTriangle
                            className="h-4 w-4"
                            style={{ color: severityColors[inc.severity]?.color ?? '#818cf8' }}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{inc.title}</h4>
                          <p className="mt-0.5 text-xs text-[#52525b]">
                            {inc.serviceName} · {timeAgo(inc.detectedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="border-transparent text-[10px]"
                          style={{
                            color: severityColors[inc.severity]?.color ?? '#818cf8',
                            backgroundColor: `${severityColors[inc.severity]?.bg ?? '#818cf8'}15`,
                          }}
                        >
                          {inc.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            inc.status === "resolved"
                              ? "border-[#34d399]/20 text-[#34d399]"
                              : "border-[#fbbf24]/20 text-[#fbbf24]"
                          }`}
                        >
                          {inc.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="mb-3 text-xs text-[#71717a]">{inc.description}</p>

                    {inc.aiAnalysis && (
                      <div className="mb-3 rounded-lg p-3" style={{ background: 'rgba(129, 140, 248, 0.05)', border: '1px solid rgba(129, 140, 248, 0.1)' }}>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <IconBrain className="h-3.5 w-3.5 text-[#818cf8]" />
                          <span className="text-[10px] font-semibold text-[#a5b4fc]">AI Explanation</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#a1a1aa]">{inc.aiAnalysis}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {inc.rootCause && (
                        <div className="flex-1 mr-4">
                          <p className="text-[10px] font-semibold uppercase text-[#f87171]">Root Cause</p>
                          <p className="mt-0.5 font-mono text-[11px] text-[#71717a] line-clamp-1">{inc.rootCause}</p>
                        </div>
                      )}
                      {inc.confidence && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-1.5 w-16 rounded-full bg-[#18181b]">
                            <div className="h-full rounded-full bg-[#818cf8]" style={{ width: `${inc.confidence}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-[#a5b4fc]">{inc.confidence}%</span>
                        </div>
                      )}
                    </div>

                    {inc.patches && inc.patches.length > 0 && (
                      <div className="mt-3 rounded-lg bg-[#0c0c0e] p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <IconCode className="h-3.5 w-3.5 text-[#34d399]" />
                          <span className="text-[10px] font-semibold text-[#34d399]">Files Patched ({inc.patches.length})</span>
                        </div>
                        <div className="space-y-1">
                          {inc.patches.map((p, i) => (
                            <p key={i} className="font-mono text-[11px] text-[#60a5fa]">{p.filePath}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/dashboard/services/${inc.serviceId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-[#818cf8] hover:underline"
                    >
                      View in service detail <IconArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function InsightCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-[#111113] p-5 transition-all duration-300 hover:bg-[#151517]"
      style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <div
        className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[#52525b]">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-white">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

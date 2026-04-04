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
    low: { color: "hsl(199, 89%, 55%)", bg: "hsl(199, 89%, 48%)" },
    medium: { color: "hsl(38, 92%, 55%)", bg: "hsl(38, 92%, 50%)" },
    high: { color: "hsl(0, 72%, 60%)", bg: "hsl(0, 72%, 51%)" },
    critical: { color: "hsl(0, 72%, 51%)", bg: "hsl(0, 72%, 45%)" },
  };

  const actionIcon = (type: string) => {
    switch (type) {
      case "bug_detected":
        return <IconBug className="h-4 w-4 text-[hsl(0,72%,60%)]" />;
      case "anomaly_detected":
        return <IconAlertTriangle className="h-4 w-4 text-[hsl(38,92%,55%)]" />;
      case "fix_generated":
        return <IconSparkles className="h-4 w-4 text-[hsl(199,89%,55%)]" />;
      case "pr_created":
        return <IconShieldCheck className="h-4 w-4 text-[hsl(265,90%,70%)]" />;
      case "auto_resolved":
        return <IconShieldCheck className="h-4 w-4 text-[hsl(142,71%,55%)]" />;
      default:
        return <IconBrain className="h-4 w-4 text-[hsl(265,90%,70%)]" />;
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
        title="AI Insights"
        subtitle="Automated anomaly detection and root cause analysis"
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
                <Skeleton key={i} className="h-[100px] rounded-xl bg-[hsl(225,15%,12%)]" />
              ))
            ) : (
              <>
                <motion.div variants={item}>
                  <InsightCard
                    label="Total Anomalies"
                    value={incidents.length.toString()}
                    icon={<IconTarget className="h-5 w-5" />}
                    color="hsl(265, 90%, 65%)"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="Critical Issues"
                    value={incidents.filter((i) => i.severity === "critical").length.toString()}
                    icon={<IconAlertTriangle className="h-5 w-5" />}
                    color="hsl(0, 72%, 51%)"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="Auto-Resolved"
                    value={incidents.filter((i) => i.status === "resolved").length.toString()}
                    icon={<IconShieldCheck className="h-5 w-5" />}
                    color="hsl(142, 71%, 45%)"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <InsightCard
                    label="AI Actions Today"
                    value={actions.length.toString()}
                    icon={<IconChartBar className="h-5 w-5" />}
                    color="hsl(199, 89%, 48%)"
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
              className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5 lg:col-span-1"
            >
              <div className="mb-4 flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-[hsl(265,90%,70%)]" />
                <h3 className="text-sm font-semibold text-white">AI Activity Timeline</h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg bg-[hsl(225,15%,12%)]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {actions.map((action, idx) => (
                    <div key={action.id} className="flex gap-3">
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(220,14%,14%)]">
                          {actionIcon(action.type)}
                        </div>
                        {idx < actions.length - 1 && (
                          <div className="w-px flex-1 bg-[hsl(220,14%,16%)]" />
                        )}
                      </div>
                      <div className="pb-5 min-w-0">
                        <p className="text-xs text-[hsl(220,10%,75%)] line-clamp-2">
                          {action.message}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[hsl(220,10%,40%)]">
                          {action.serviceName} · {timeAgo(action.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Detailed Insights */}
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
                    <Skeleton key={i} className="h-[220px] rounded-xl bg-[hsl(225,15%,12%)]" />
                  ))}
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5 transition-colors hover:border-[hsl(220,14%,22%)]"
                  >
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${severityColors[inc.severity].bg}15`,
                          }}
                        >
                          <IconAlertTriangle
                            className="h-4 w-4"
                            style={{ color: severityColors[inc.severity].color }}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{inc.title}</h4>
                          <p className="mt-0.5 text-xs text-[hsl(220,10%,50%)]">
                            {inc.serviceName} · {timeAgo(inc.detectedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="border-transparent text-[10px]"
                          style={{
                            color: severityColors[inc.severity].color,
                            backgroundColor: `${severityColors[inc.severity].bg}15`,
                          }}
                        >
                          {inc.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            inc.status === "resolved"
                              ? "border-[hsl(142,71%,45%)/30%] text-[hsl(142,71%,55%)]"
                              : "border-[hsl(38,92%,50%)/30%] text-[hsl(38,92%,55%)]"
                          }`}
                        >
                          {inc.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-3 text-xs text-[hsl(220,10%,60%)]">{inc.description}</p>

                    {/* AI Analysis */}
                    {inc.aiAnalysis && (
                      <div className="mb-3 rounded-lg border border-[hsl(265,90%,65%)/15%] bg-[hsl(265,90%,65%)/5%] p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <IconBrain className="h-3.5 w-3.5 text-[hsl(265,90%,70%)]" />
                          <span className="text-[10px] font-semibold text-[hsl(265,90%,75%)]">
                            AI Explanation
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[hsl(220,10%,70%)]">
                          {inc.aiAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Root Cause + Confidence */}
                    <div className="flex items-center justify-between">
                      {inc.rootCause && (
                        <div className="flex-1 mr-4">
                          <p className="text-[10px] font-semibold uppercase text-[hsl(0,72%,55%)]">
                            Root Cause
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-[hsl(220,10%,60%)] line-clamp-1">
                            {inc.rootCause}
                          </p>
                        </div>
                      )}
                      {inc.confidence && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-1.5 w-16 rounded-full bg-[hsl(220,14%,16%)]">
                            <div
                              className="h-full rounded-full bg-[hsl(265,90%,65%)]"
                              style={{ width: `${inc.confidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-[hsl(265,90%,75%)]">
                            {inc.confidence}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Patches applied */}
                    {inc.patches && inc.patches.length > 0 && (
                      <div className="mt-3 rounded-lg bg-[hsl(220,14%,10%)] p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <IconCode className="h-3.5 w-3.5 text-[hsl(142,71%,55%)]" />
                          <span className="text-[10px] font-semibold text-[hsl(142,71%,65%)]">
                            Files Patched ({inc.patches.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {inc.patches.map((p, i) => (
                            <p key={i} className="font-mono text-[11px] text-[hsl(199,89%,60%)]">
                              {p.filePath}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View in Service */}
                    <Link
                      href={`/dashboard/services/${inc.serviceId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-[hsl(265,90%,70%)] hover:underline"
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
    <div className="group relative overflow-hidden rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5 transition-all duration-300 hover:border-[hsl(220,14%,22%)]">
      <div
        className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[hsl(220,10%,50%)]">{label}</p>
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

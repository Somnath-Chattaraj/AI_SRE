"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconBell,
  IconAlertTriangle,
  IconBug,
  IconSparkles,
  IconShieldCheck,
  IconGitPullRequest,
  IconActivity,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import { fetchRealAIActions, type AIAction } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

const actionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  anomaly_detected: {
    color: "#fbbf24",
    icon: <IconAlertTriangle className="h-5 w-5" />,
  },
  bug_detected: {
    color: "#f87171",
    icon: <IconBug className="h-5 w-5" />,
  },
  fix_generated: {
    color: "#60a5fa",
    icon: <IconSparkles className="h-5 w-5" />,
  },
  pr_created: {
    color: "#818cf8",
    icon: <IconGitPullRequest className="h-5 w-5" />,
  },
  auto_resolved: {
    color: "#34d399",
    icon: <IconShieldCheck className="h-5 w-5" />,
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export default function NotificationsPage() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealAIActions()
      .then(setActions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        title="Activity Feed"
        subtitle={`${actions.length} AI actions`}
      />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl bg-[#18181b]" />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#52525b]">
              <IconBell className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium text-white">No activity yet</p>
              <p className="mt-1 text-sm">AI actions will appear here as they happen</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {actions.map((action) => {
                const cfg = actionConfig[action.type] ?? {
                  color: "#71717a",
                  icon: <IconActivity className="h-5 w-5" />,
                };
                return (
                  <motion.div
                    key={action.id}
                    variants={item}
                    className="flex items-start gap-4 rounded-xl bg-[#111113] p-4 hover:bg-[#151517] transition-colors"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <div
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white line-clamp-2">{action.message}</p>
                        <span className="shrink-0 text-[10px] text-[#52525b]">
                          {timeAgo(action.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#52525b]">
                        {action.serviceName} · {action.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}

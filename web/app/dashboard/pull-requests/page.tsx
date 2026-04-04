"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconGitPullRequest,
  IconGitMerge,
  IconExternalLink,
  IconClock,
  IconCode,
  IconX,
  IconEye,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import { fetchPullRequests } from "@/lib/mock-api";
import type { PullRequest, PRStatus } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<PRStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    color: "hsl(38, 92%, 55%)",
    bg: "hsl(38, 92%, 50%)",
    icon: <IconClock className="h-4 w-4" />,
  },
  merged: {
    color: "hsl(142, 71%, 55%)",
    bg: "hsl(142, 71%, 45%)",
    icon: <IconGitMerge className="h-4 w-4" />,
  },
  failed: {
    color: "hsl(0, 72%, 60%)",
    bg: "hsl(0, 72%, 51%)",
    icon: <IconX className="h-4 w-4" />,
  },
  reviewing: {
    color: "hsl(265, 90%, 70%)",
    bg: "hsl(265, 90%, 65%)",
    icon: <IconEye className="h-4 w-4" />,
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function PullRequestsPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | PRStatus>("all");
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  useEffect(() => {
    fetchPullRequests().then((p) => {
      setPrs(p);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? prs : prs.filter((p) => p.status === filter);

  const stats = {
    total: prs.length,
    pending: prs.filter((p) => p.status === "pending").length,
    merged: prs.filter((p) => p.status === "merged").length,
    reviewing: prs.filter((p) => p.status === "reviewing").length,
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
        title="Fixes & Pull Requests"
        subtitle={`${stats.total} AI-generated fixes · ${stats.merged} merged`}
      />

      <div className="p-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Summary */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-3">
            {(["all", "pending", "reviewing", "merged", "failed"] as const).map((f) => {
              const count =
                f === "all"
                  ? prs.length
                  : prs.filter((p) => p.status === f).length;
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "border-[hsl(265,90%,65%)/30%] bg-[hsl(265,90%,65%)/10%] text-[hsl(265,90%,75%)]"
                      : "border-[hsl(220,14%,18%)] bg-[hsl(225,15%,10%)] text-[hsl(220,10%,55%)] hover:border-[hsl(220,14%,24%)] hover:text-white"
                  }`}
                >
                  {f !== "all" && statusConfig[f] && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: statusConfig[f].bg,
                      }}
                    />
                  )}
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </button>
              );
            })}
          </motion.div>

          {/* PR List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[150px] rounded-xl bg-[hsl(225,15%,12%)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[hsl(220,10%,45%)]">
              <IconGitPullRequest className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium text-white">No pull requests found</p>
              <p className="mt-1 text-sm">No AI-generated fixes match this filter</p>
            </div>
          ) : (
            filtered.map((pr) => (
              <motion.div key={pr.id} variants={item}>
                <div className="rounded-xl border border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)] p-5 transition-colors hover:border-[hsl(220,14%,22%)]">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${statusConfig[pr.status].bg}15`,
                          color: statusConfig[pr.status].color,
                        }}
                      >
                        {statusConfig[pr.status].icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{pr.title}</h3>
                        <p className="mt-0.5 text-xs text-[hsl(220,10%,50%)]">
                          {pr.serviceName} · Created {timeAgo(pr.createdAt)}
                          {pr.mergedAt && ` · Merged ${timeAgo(pr.mergedAt)}`}
                        </p>
                        <p className="mt-1.5 text-xs text-[hsl(220,10%,60%)]">
                          {pr.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge
                        className="border-transparent text-[10px]"
                        style={{
                          color: statusConfig[pr.status].color,
                          backgroundColor: `${statusConfig[pr.status].bg}15`,
                        }}
                      >
                        {pr.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats + Actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-xs text-[hsl(220,10%,45%)]">
                        <IconCode className="h-3.5 w-3.5" />
                        {pr.filesChanged} files
                      </span>
                      <span className="text-xs text-[hsl(142,71%,55%)]">
                        +{pr.additions}
                      </span>
                      <span className="text-xs text-[hsl(0,72%,60%)]">
                        -{pr.deletions}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setExpandedPR(expandedPR === pr.id ? null : pr.id)
                        }
                        className="flex items-center gap-1 text-xs text-[hsl(265,90%,70%)] transition-colors hover:text-[hsl(265,90%,80%)]"
                      >
                        <IconCode className="h-3 w-3" />
                        {expandedPR === pr.id ? "Hide diff" : "View diff"}
                      </button>
                      <a
                        href={pr.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[hsl(220,10%,55%)] transition-colors hover:text-white"
                      >
                        <IconExternalLink className="h-3 w-3" />
                        GitHub
                      </a>
                    </div>
                  </div>

                  {/* Expandable Diff */}
                  {expandedPR === pr.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden rounded-lg border border-[hsl(220,14%,16%)] bg-[hsl(222,14%,7%)]"
                    >
                      <div className="border-b border-[hsl(220,14%,14%)] px-3 py-1.5 text-[10px] text-[hsl(220,10%,45%)]">
                        {pr.diffSummary}
                      </div>
                      <pre className="max-h-[300px] overflow-auto p-0 text-xs">
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
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch,
  IconServer,
  IconLayoutDashboard,
  IconBrain,
  IconGitPullRequest,
  IconBell,
  IconArrowRight,
} from "@tabler/icons-react";
import { useAppStore } from "@/lib/store";
import { services } from "@/lib/mock-data";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [query, setQuery] = useState("");

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Overview",
        icon: <IconLayoutDashboard className="h-4 w-4" />,
        action: () => router.push("/dashboard"),
        category: "Navigation",
      },
      {
        id: "nav-services",
        label: "Go to Services",
        icon: <IconServer className="h-4 w-4" />,
        action: () => router.push("/dashboard/services"),
        category: "Navigation",
      },
      {
        id: "nav-insights",
        label: "Go to Insights",
        icon: <IconBrain className="h-4 w-4" />,
        action: () => router.push("/dashboard/insights"),
        category: "Navigation",
      },
      {
        id: "nav-prs",
        label: "Go to Fixes & PRs",
        icon: <IconGitPullRequest className="h-4 w-4" />,
        action: () => router.push("/dashboard/pull-requests"),
        category: "Navigation",
      },
      {
        id: "nav-notifications",
        label: "Go to Activity",
        icon: <IconBell className="h-4 w-4" />,
        action: () => router.push("/dashboard/notifications"),
        category: "Navigation",
      },
      ...services.map((svc) => ({
        id: `svc-${svc.id}`,
        label: svc.name,
        description: svc.endpoint,
        icon: <IconServer className="h-4 w-4" />,
        action: () => router.push(`/dashboard/services/${svc.id}`),
        category: "Services",
      })),
    ],
    [router],
  );

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [query, items]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) setQuery("");
  }, [commandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[15%] z-[100] w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl bg-[#111113] shadow-2xl shadow-black/40"
            style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <IconSearch className="h-4 w-4 text-[#52525b]" />
              <input
                autoFocus
                type="text"
                placeholder="Search services, navigate..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#3f3f46] focus:outline-none"
              />
              <kbd className="rounded-md border border-[#27272a] bg-[#18181b] px-1.5 py-0.5 font-mono text-[10px] text-[#52525b]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#52525b]">
                  <IconSearch className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, categoryItems]) => (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#3f3f46]">
                      {category}
                    </div>
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          setCommandPaletteOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#a1a1aa] transition-colors hover:bg-[#18181b] hover:text-white"
                      >
                        <span className="text-[#52525b]">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-[#3f3f46]">
                            {item.description}
                          </span>
                        )}
                        <IconArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

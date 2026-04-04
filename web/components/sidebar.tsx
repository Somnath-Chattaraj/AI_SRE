"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLayoutDashboard,
  IconServer,
  IconBrain,
  IconGitPullRequest,
  IconBell,
  IconShieldCheck,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: IconLayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: IconServer },
  { href: "/dashboard/insights", label: "AI Insights", icon: IconBrain },
  { href: "/dashboard/pull-requests", label: "Fixes & PRs", icon: IconGitPullRequest },
  { href: "/dashboard/notifications", label: "Activity Feed", icon: IconBell },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,15%)]">
            <IconShieldCheck className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="text-sm font-bold tracking-tight text-white">AutoHeal</span>
                <span className="text-[10px] text-[hsl(220,10%,45%)]">v2.4.1</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <IconSearch className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      ⌘K
                    </kbd>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                <p>Search (⌘K)</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[hsl(0,0%,9%)] text-[hsl(0,0%,98%)]"
                        : "text-[hsl(0,0%,60%)] hover:bg-[hsl(0,0%,9%)] hover:text-white",
                      sidebarCollapsed && "justify-center px-0",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[hsl(0,0%,98%)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-3 space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <IconSettings className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right"><p>Settings</p></TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <IconLogout className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>Sign Out</span>}
              </Link>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right"><p>Sign Out</p></TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <IconChevronRight className="h-3 w-3" />
          ) : (
            <IconChevronLeft className="h-3 w-3" />
          )}
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}

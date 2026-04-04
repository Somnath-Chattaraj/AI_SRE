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
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconHammer,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: IconLayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: IconServer },
  { href: "/dashboard/insights", label: "Insights", icon: IconBrain },
  { href: "/dashboard/pull-requests", label: "Fixes & PRs", icon: IconGitPullRequest },
  { href: "/dashboard/notifications", label: "Activity", icon: IconBell },
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
        className="fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#0c0c0e]"
        style={{ borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center gap-3 px-5"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg os-gradient">
            <IconHammer className="h-4 w-4 text-white" />
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
                <span className="text-sm font-bold tracking-[-0.02em] text-white">OpSmith</span>
                <span className="text-[10px] font-mono tracking-wider text-[#52525b]">operations platform</span>
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
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#52525b] transition-all bg-[#111113] hover:text-[#a1a1aa] hover:bg-[#18181b]",
                  sidebarCollapsed && "justify-center px-0",
                )}
                style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <IconSearch className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="rounded-md px-1.5 py-0.5 font-mono text-[10px] text-[#3f3f46] bg-[#09090b]"
                      style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
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
        <nav className="flex-1 space-y-0.5 px-2 py-2">
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
                        ? "bg-[#818cf8]/10 text-[#818cf8]"
                        : "text-[#52525b] hover:bg-[#18181b] hover:text-[#a1a1aa]",
                      sidebarCollapsed && "justify-center px-0",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#818cf8]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
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
        <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#52525b] transition-colors hover:text-[#a1a1aa] hover:bg-[#18181b]",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <IconSettings className="h-[18px] w-[18px] shrink-0" />
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#52525b] transition-colors hover:text-[#f87171] hover:bg-[#f87171]/5",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <IconLogout className="h-[18px] w-[18px] shrink-0" />
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
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-[#18181b] text-[#52525b] shadow-lg transition-colors hover:bg-[#27272a] hover:text-[#a1a1aa]"
          style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
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

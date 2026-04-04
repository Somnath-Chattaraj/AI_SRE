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
        className="fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#131313]"
        style={{ borderRight: '1px solid rgba(72, 72, 72, 0.15)' }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center gap-3 px-5"
          style={{ borderBottom: '1px solid rgba(72, 72, 72, 0.15)' }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f2020]">
            <IconShieldCheck className="h-5 w-5 text-[#ffb77b]" />
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
                <span className="text-sm font-black tracking-[-0.02em] uppercase text-[#ffb77b]">AutoHeal</span>
                <span className="text-[10px] font-mono tracking-widest text-[#acabaa]/60">V2.4.1-STABLE</span>
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
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#acabaa]/60 transition-colors bg-[#1f2020] hover:text-[#e7e5e4]",
                  sidebarCollapsed && "justify-center px-0",
                )}
                style={{ border: '1px solid rgba(72, 72, 72, 0.15)' }}
              >
                <IconSearch className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px] text-[#acabaa]/40 bg-[#131313]"
                      style={{ border: '1px solid rgba(72, 72, 72, 0.2)' }}
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
                      "group relative flex items-center gap-3 rounded-none px-5 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#1f2020] text-[#ffb77b]"
                        : "text-[#767575] hover:bg-[#1f2020] hover:text-[#e7e5e4]",
                      sidebarCollapsed && "justify-center px-0",
                    )}
                  >
                    {/* Copper left pipe indicator for active */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#B87333]"
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
        <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid rgba(72, 72, 72, 0.15)' }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-none px-3 py-2.5 text-sm text-[#767575] transition-colors hover:text-[#e7e5e4]",
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
                  "flex items-center gap-3 rounded-none px-3 py-2.5 text-sm text-[#767575] transition-colors hover:text-[#ed7f64]",
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
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-[#1f2020] text-[#acabaa] shadow-sm transition-colors hover:bg-[#252626] hover:text-[#e7e5e4]"
          style={{ border: '1px solid rgba(72, 72, 72, 0.2)' }}
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

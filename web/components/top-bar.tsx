"use client";

import { IconBell, IconSparkles } from "@tabler/icons-react";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { unreadCount, user } = useAppStore();

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[#09090b]/80 px-8 backdrop-blur-xl"
      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
    >
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[#52525b]">{subtitle}</p>
          )}
        </div>
        {/* AI Status pill */}
        <div className="hidden items-center gap-2 rounded-full px-3 py-1 md:flex"
          style={{
            background: 'rgba(129, 140, 248, 0.08)',
            border: '1px solid rgba(129, 140, 248, 0.15)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#818cf8] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#818cf8]" />
          </span>
          <span className="text-[10px] font-medium tracking-wide text-[#818cf8]">AI Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-[#52525b] text-xs">
          <IconSparkles className="h-3.5 w-3.5 text-[#818cf8]/50" />
          <span className="font-mono text-[11px] tracking-wide">Connected</span>
        </div>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#52525b] transition-colors hover:bg-[#18181b] hover:text-[#a1a1aa]"
        >
          <IconBell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center bg-[#f87171] px-1 text-[9px] text-white border-none"
            >
              {unreadCount}
            </Badge>
          )}
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden text-xs font-semibold text-white os-gradient"
          >
            {user?.name?.charAt(0) || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

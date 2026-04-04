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
      className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[#0e0e0e]/80 px-8 backdrop-blur-xl"
      style={{ borderBottom: '1px solid rgba(72, 72, 72, 0.15)' }}
    >
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.03em] text-[#ffb77b]">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[#acabaa]/60">{subtitle}</p>
          )}
        </div>
        {/* AI Active pill — copper ping */}
        <div className="hidden items-center gap-2 rounded-full px-3 py-1 md:flex"
          style={{
            background: 'rgba(109, 58, 0, 0.2)',
            border: '1px solid rgba(255, 183, 123, 0.2)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb77b] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffb77b]" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffb77b]">AI Active</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* HEAL-OS Terminal Status */}
        <div className="hidden md:flex items-center gap-2 text-[#acabaa] text-sm font-medium">
          <IconSparkles className="h-3.5 w-3.5 text-[#acabaa]/60" />
          <span className="font-mono text-xs opacity-60 tracking-wider">HEAL-OS_CONNECTED</span>
        </div>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#acabaa] transition-colors hover:bg-[#1f2020] hover:text-[#e7e5e4]"
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center bg-[#ed7f64] px-1 text-[9px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden text-xs font-bold text-[#e7e5e4] bg-[#1f2020]"
            style={{ border: '1px solid rgba(72, 72, 72, 0.3)' }}
          >
            {user?.name?.charAt(0) || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

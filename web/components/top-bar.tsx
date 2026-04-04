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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(220,14%,16%)] bg-[hsl(222,14%,7%)/80%] px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[hsl(220,10%,45%)]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* AI Status */}
        <div className="hidden items-center gap-2 rounded-full border border-[hsl(265,90%,65%)/20%] bg-[hsl(265,90%,65%)/8%] px-3 py-1.5 md:flex">
          <IconSparkles className="h-3.5 w-3.5 text-[hsl(265,90%,70%)]" />
          <span className="text-xs font-medium text-[hsl(265,90%,75%)]">AI Active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(142,71%,45%)] animate-pulse" />
        </div>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(220,10%,55%)] transition-colors hover:bg-[hsl(220,14%,14%)] hover:text-white"
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center bg-[hsl(0,72%,51%)] px-1 text-[9px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,15%)] text-xs font-bold text-white">
            {user?.name?.charAt(0) || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

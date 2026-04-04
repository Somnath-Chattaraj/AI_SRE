"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconBell,
  IconCheck,
  IconChecks,
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconAlertCircle,
  IconServer,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/mock-api";
import type { Notification } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import Link from "next/link";

const typeConfig: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  info: {
    color: "hsl(199, 89%, 55%)",
    icon: <IconInfoCircle className="h-5 w-5" />,
  },
  warning: {
    color: "hsl(38, 92%, 55%)",
    icon: <IconAlertTriangle className="h-5 w-5" />,
  },
  error: {
    color: "hsl(0, 72%, 60%)",
    icon: <IconAlertCircle className="h-5 w-5" />,
  },
  success: {
    color: "hsl(142, 71%, 55%)",
    icon: <IconCircleCheck className="h-5 w-5" />,
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  useEffect(() => {
    fetchNotifications().then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, []);

  const unread = notifications.filter((n) => !n.read);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const newUnread = notifications.filter((n) => !n.read && n.id !== id).length;
    setUnreadCount(newUnread);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
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
        title="Notifications"
        subtitle={`${unread.length} unread notifications`}
      />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBell className="h-5 w-5 text-[hsl(220,10%,55%)]" />
              <h2 className="text-sm font-semibold text-white">
                All Notifications ({notifications.length})
              </h2>
            </div>
            {unread.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="border-[hsl(220,14%,20%)] bg-transparent text-xs text-[hsl(220,10%,60%)] hover:bg-[hsl(220,14%,14%)] hover:text-white"
              >
                <IconChecks className="mr-1.5 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[80px] rounded-xl bg-[hsl(225,15%,12%)]" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[hsl(220,10%,45%)]">
              <IconBell className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium text-white">No notifications</p>
              <p className="mt-1 text-sm">You&apos;re all caught up!</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {notifications.map((notif) => {
                const cfg = typeConfig[notif.type];
                return (
                  <motion.div
                    key={notif.id}
                    variants={item}
                    className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all ${
                      notif.read
                        ? "border-[hsl(220,14%,16%)] bg-[hsl(225,15%,10%)]"
                        : "border-[hsl(220,14%,20%)] bg-[hsl(225,15%,12%)]"
                    } hover:border-[hsl(220,14%,24%)]`}
                  >
                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[hsl(265,90%,65%)]" />
                    )}

                    {/* Icon */}
                    <div
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${cfg.color}15`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${notif.read ? "text-[hsl(220,10%,65%)]" : "text-white"}`}>
                          {notif.title}
                        </h4>
                        <span className="shrink-0 text-[10px] text-[hsl(220,10%,40%)]">
                          {timeAgo(notif.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[hsl(220,10%,50%)]">
                        {notif.message}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        {notif.serviceId && (
                          <Link
                            href={`/dashboard/services/${notif.serviceId}`}
                            className="flex items-center gap-1 text-[10px] text-[hsl(265,90%,70%)] hover:underline"
                          >
                            <IconServer className="h-3 w-3" />
                            View service
                          </Link>
                        )}
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="flex items-center gap-1 text-[10px] text-[hsl(220,10%,45%)] transition-colors hover:text-white"
                          >
                            <IconCheck className="h-3 w-3" />
                            Mark read
                          </button>
                        )}
                      </div>
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

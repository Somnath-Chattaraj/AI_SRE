"use client";

import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <CommandPalette />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1"
      >
        {children}
      </motion.main>
    </div>
  );
}

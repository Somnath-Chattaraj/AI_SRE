"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconPlus,
  IconServer,
  IconClock,
  IconSearch,
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconExternalLink,
} from "@tabler/icons-react";
import { TopBar } from "@/components/top-bar";
import {
  fetchRealServices,
  fetchRealMetrics,
  addRealService,
  type BackendService,
  type ServiceMetrics,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type ServiceStatus = "healthy" | "warning" | "critical" | "unknown";

const DOT_COLOR: Record<ServiceStatus, string> = {
  healthy: "#34d399",
  warning: "#fbbf24",
  critical: "#f87171",
  unknown: "#52525b",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  unknown: "Unknown",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface EnrichedService {
  id: string;
  name: string;
  url_server: string;
  url_codebase: string;
  status: ServiceStatus;
  uptime: number;
  avgLatency: number;
  lastChecked: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<EnrichedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    setError("");
    try {
      const raw = await fetchRealServices();
      const enriched = await Promise.all(
        raw.map(async (svc): Promise<EnrichedService> => {
          try {
            const metrics = await fetchRealMetrics(svc.id);
            return {
              id: svc.id,
              name: svc.name,
              url_server: svc.url_server,
              url_codebase: svc.url_codebase,
              status: metrics.status,
              uptime: metrics.uptime,
              avgLatency: metrics.avgLatency,
              lastChecked: metrics.lastChecked,
            };
          } catch {
            return {
              id: svc.id,
              name: svc.name,
              url_server: svc.url_server,
              url_codebase: svc.url_codebase,
              status: "unknown",
              uptime: 0,
              avgLatency: 0,
              lastChecked: new Date().toISOString(),
            };
          }
        }),
      );
      setServices(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url_server.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: services.length,
    healthy: services.filter((s) => s.status === "healthy").length,
    warning: services.filter((s) => s.status === "warning").length,
    critical: services.filter((s) => s.status === "critical").length,
  };

  return (
    <>
      <TopBar
        title="Services"
        subtitle={`${stats.total} monitored · ${stats.critical} critical`}
      />

      <div className="p-6">
        {/* Summary pills */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#71717a]">
          <span>{stats.total} total</span>
          <span className="text-[#27272a]">·</span>
          <span className="text-[#34d399]">{stats.healthy} healthy</span>
          <span className="text-[#27272a]">·</span>
          <span className="text-[#fbbf24]">{stats.warning} warning</span>
          <span className="text-[#27272a]">·</span>
          <span className="text-[#f87171]">{stats.critical} critical</span>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3f3f46]" />
            <Input
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-[#27272a] bg-[#111113] pl-9 text-sm text-white placeholder:text-[#3f3f46]"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="os-gradient text-sm font-medium text-white hover:opacity-90 border-0"
          >
            <IconPlus className="mr-1.5 h-3.5 w-3.5" />
            Add service
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 px-4 py-3 text-sm text-[#f87171]">
            {error}
          </div>
        )}

        {/* Services table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg bg-[#18181b]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-[#52525b]">
            <IconServer className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm text-[#71717a]">No services found</p>
            <p className="mt-1 text-xs">
              {search ? "Try a different search" : "Add your first service to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="grid grid-cols-[1fr_120px_80px_80px_100px] bg-[#0c0c0e] px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <span>Service</span>
              <span>Status</span>
              <span>Uptime</span>
              <span>Latency</span>
              <span>Last check</span>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {filtered.map((svc) => (
                <Link
                  key={svc.id}
                  href={`/dashboard/services/${svc.id}`}
                  className="grid grid-cols-[1fr_120px_80px_80px_100px] items-center bg-[#111113] px-4 py-3.5 text-sm transition-colors hover:bg-[#18181b]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{svc.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10px] text-[#3f3f46]">
                      <IconExternalLink className="h-2.5 w-2.5 shrink-0" />
                      {svc.url_server}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOT_COLOR[svc.status] }} />
                    <span className="text-xs" style={{ color: DOT_COLOR[svc.status] }}>{STATUS_LABEL[svc.status]}</span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">
                    {svc.status === "unknown" ? "—" : `${svc.uptime.toFixed(1)}%`}
                  </span>
                  <span className="text-xs text-[#a1a1aa]">
                    {svc.status === "unknown" ? "—" : `${svc.avgLatency}ms`}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#52525b]">
                    <IconClock className="h-3 w-3" />
                    {timeAgo(svc.lastChecked)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddServiceModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (data) => {
            const newSvc = await addRealService(data);
            setShowAddModal(false);
            setServices((prev) => [
              ...prev,
              {
                id: newSvc.id,
                name: newSvc.name,
                url_server: newSvc.url_server,
                url_codebase: newSvc.url_codebase,
                status: "unknown",
                uptime: 0,
                avgLatency: 0,
                lastChecked: new Date().toISOString(),
              },
            ]);
          }}
        />
      )}
    </>
  );
}

function AddServiceModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { name: string; url_server: string; url_codebase?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [urlServer, setUrlServer] = useState("");
  const [urlCodebase, setUrlCodebase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onAdd({ name, url_server: urlServer, url_codebase: urlCodebase });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add service");
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 z-[91] w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#111113] p-6 shadow-2xl"
        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Add service</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#52525b] hover:bg-[#18181b] hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#71717a]">Service name</Label>
            <Input
              placeholder="e.g. Payment-API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#71717a]">
              Server URL
              <span className="ml-1 text-[#3f3f46]">(health endpoint)</span>
            </Label>
            <Input
              placeholder="https://api.example.com"
              value={urlServer}
              onChange={(e) => setUrlServer(e.target.value)}
              required
              className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#71717a]">
              Codebase URL
              <span className="ml-1 text-[#3f3f46]">(optional, GitHub repo)</span>
            </Label>
            <Input
              placeholder="https://github.com/org/repo"
              value={urlCodebase}
              onChange={(e) => setUrlCodebase(e.target.value)}
              className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 px-3 py-2 text-xs text-[#f87171]">
              <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#27272a] bg-transparent text-sm text-[#71717a] hover:bg-[#18181b] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 os-gradient text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 border-0"
            >
              {loading ? <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Add service
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

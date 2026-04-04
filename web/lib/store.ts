// ============================================================
// AutoHeal – Global Store (Zustand)
// ============================================================

import { create } from "zustand"
import type { User } from "@/lib/mock-api"

interface AppState {
  // Auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void

  // UI
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Notifications
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),

  // UI
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Notifications
  unreadCount: 2,
  setUnreadCount: (count) => set({ unreadCount: count }),
}))

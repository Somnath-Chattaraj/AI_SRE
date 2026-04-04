// ============================================================
// AutoHeal – better-auth client
// ============================================================
// This file is safe to import in client components.
// It points at the sre_anomaly backend's /api/auth/* endpoints.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;

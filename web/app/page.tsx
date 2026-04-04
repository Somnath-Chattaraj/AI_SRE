"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconHammer, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";
import { useAppStore } from "@/lib/store";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function SignInPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError("");
    if (!email || !password) { setSignInError("Please fill in all fields"); return; }
    setSignInLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.user) {
        setAuth(
          { id: res.data.user.id, name: res.data.user.name ?? email, email: res.data.user.email, role: "admin" },
          res.data.session?.token ?? "",
        );
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    if (!regName || !regEmail || !regPassword || !regConfirm) { setRegError("Please fill in all fields"); return; }
    if (regPassword.length < 8) { setRegError("Password must be at least 8 characters"); return; }
    if (regPassword !== regConfirm) { setRegError("Passwords do not match"); return; }
    setRegLoading(true);
    try {
      const res = await signUp.email({ name: regName, email: regEmail, password: regPassword });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.user) {
        setAuth(
          { id: res.data.user.id, name: res.data.user.name ?? regName, email: res.data.user.email, role: "admin" },
          res.data.session?.token ?? "",
        );
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] overflow-hidden">
      {/* Particle background */}
      <Particles
        className="absolute inset-0"
        quantity={60}
        color="#818cf8"
        ease={80}
        size={0.6}
        staticity={40}
        refresh
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[#818cf8]/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-[#6366f1]/5 blur-[100px]" />

      <div className="relative w-full max-w-[380px] px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl os-gradient shadow-lg shadow-[#818cf8]/20 animate-float">
            <IconHammer className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">OpSmith</h1>
            <p className="mt-1 text-sm text-[#52525b]">AI-Powered Operations Platform</p>
          </div>
        </div>

        {/* Sign in form */}
        <div className="rounded-xl p-6 glass-strong">
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-[#71717a]">Email</Label>
              <Input
                id="email" type="email" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46] focus:border-[#818cf8]/50 focus:ring-[#818cf8]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-[#71717a]">Password</Label>
              <Input
                id="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46] focus:border-[#818cf8]/50 focus:ring-[#818cf8]/20"
              />
            </div>

            {signInError && (
              <p className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 px-3 py-2 text-xs text-[#f87171]">
                {signInError}
              </p>
            )}

            <ShimmerButton
              className="w-full mt-1"
              shimmerColor="#818cf8"
              shimmerSize="0.08em"
              background="linear-gradient(135deg, #818cf8, #6366f1, #4f46e5)"
            >
              <span className="text-sm font-medium text-white flex items-center justify-center">
                {signInLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </span>
            </ShimmerButton>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#27272a]" />
            <span className="text-[11px] text-[#3f3f46]">or</span>
            <div className="h-px flex-1 bg-[#27272a]" />
          </div>

          {/* Register button */}
          <Button
            type="button"
            onClick={() => { setShowRegister(true); setRegError(""); }}
            className="w-full border border-[#27272a] bg-transparent text-sm text-[#71717a] hover:bg-[#18181b] hover:text-white"
          >
            Create an account
          </Button>
        </div>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRegister(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[91] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-2xl bg-[#111113]"
            style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Create account</h2>
                <p className="mt-0.5 text-xs text-[#52525b]">Get started with OpSmith</p>
              </div>
              <button
                onClick={() => setShowRegister(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#52525b] hover:bg-[#18181b] hover:text-white"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#71717a]">Full name</Label>
                <Input
                  type="text" placeholder="Alex Chen"
                  value={regName} onChange={(e) => setRegName(e.target.value)}
                  className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#71717a]">Email</Label>
                <Input
                  type="email" placeholder="you@company.com"
                  value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#71717a]">Password</Label>
                  <Input
                    type="password" placeholder="min. 8 chars"
                    value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                    className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#71717a]">Confirm</Label>
                  <Input
                    type="password" placeholder="••••••••"
                    value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                    className="border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#3f3f46]"
                  />
                </div>
              </div>

              {regError && (
                <p className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 px-3 py-2 text-xs text-[#f87171]">
                  {regError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button" onClick={() => setShowRegister(false)}
                  className="flex-1 border border-[#27272a] bg-transparent text-sm text-[#71717a] hover:bg-[#18181b] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit" disabled={regLoading}
                  className="flex-1 os-gradient text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 border-0"
                >
                  {regLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconShieldCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";
import { useAppStore } from "@/lib/store";

export default function SignInPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Register modal
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
    <div className="flex min-h-screen items-center justify-center bg-[hsl(220,13%,7%)]">
      <div className="w-full max-w-[380px] px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(220,13%,18%)] bg-[hsl(220,13%,11%)]">
            <IconShieldCheck className="h-5 w-5 text-[hsl(220,10%,65%)]" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-white">AutoHeal</h1>
            <p className="mt-0.5 text-sm text-[hsl(220,10%,42%)]">Sign in to your account</p>
          </div>
        </div>

        {/* Sign in form */}
        <form onSubmit={handleSignIn} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-[hsl(220,10%,55%)]">Email</Label>
            <Input
              id="email" type="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-[hsl(220,10%,55%)]">Password</Label>
            <Input
              id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
            />
          </div>

          {signInError && (
            <p className="rounded-md border border-[hsl(0,60%,30%)] bg-[hsl(0,60%,12%)] px-3 py-2 text-xs text-[hsl(0,72%,65%)]">
              {signInError}
            </p>
          )}

          <Button
            type="submit" disabled={signInLoading}
            className="mt-1 w-full border border-[hsl(220,13%,22%)] bg-[hsl(220,13%,14%)] text-sm text-white hover:bg-[hsl(220,13%,18%)] disabled:opacity-50"
          >
            {signInLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[hsl(220,13%,16%)]" />
          <span className="text-[11px] text-[hsl(220,10%,35%)]">or</span>
          <div className="h-px flex-1 bg-[hsl(220,13%,16%)]" />
        </div>

        {/* Register button */}
        <Button
          type="button"
          onClick={() => { setShowRegister(true); setRegError(""); }}
          className="w-full border border-[hsl(220,13%,20%)] bg-transparent text-sm text-[hsl(220,10%,60%)] hover:bg-[hsl(220,13%,12%)] hover:text-white"
        >
          Create an account
        </Button>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRegister(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[91] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[hsl(220,13%,18%)] bg-[hsl(220,13%,9%)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Create account</h2>
                <p className="mt-0.5 text-xs text-[hsl(220,10%,42%)]">Get started with AutoHeal</p>
              </div>
              <button
                onClick={() => setShowRegister(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(220,10%,45%)] hover:bg-[hsl(220,13%,14%)] hover:text-white"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[hsl(220,10%,55%)]">Full name</Label>
                <Input
                  type="text" placeholder="Alex Chen"
                  value={regName} onChange={(e) => setRegName(e.target.value)}
                  className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,11%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[hsl(220,10%,55%)]">Email</Label>
                <Input
                  type="email" placeholder="you@company.com"
                  value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,11%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[hsl(220,10%,55%)]">Password</Label>
                  <Input
                    type="password" placeholder="min. 8 chars"
                    value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                    className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,11%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[hsl(220,10%,55%)]">Confirm</Label>
                  <Input
                    type="password" placeholder="••••••••"
                    value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                    className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,11%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)]"
                  />
                </div>
              </div>

              {regError && (
                <p className="rounded-md border border-[hsl(0,60%,30%)] bg-[hsl(0,60%,12%)] px-3 py-2 text-xs text-[hsl(0,72%,65%)]">
                  {regError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button" onClick={() => setShowRegister(false)}
                  className="flex-1 border border-[hsl(220,13%,18%)] bg-transparent text-sm text-[hsl(220,10%,55%)] hover:bg-[hsl(220,13%,13%)] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit" disabled={regLoading}
                  className="flex-1 border border-[hsl(220,13%,22%)] bg-[hsl(220,13%,14%)] text-sm text-white hover:bg-[hsl(220,13%,18%)] disabled:opacity-50"
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

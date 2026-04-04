"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconLoader2, IconHammer } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { useAppStore } from "@/lib/store";
import { Particles } from "@/components/ui/particles";

export default function SignUpPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await signUp.email({ name, email, password });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.user) {
        setAuth(
          {
            id: res.data.user.id,
            name: res.data.user.name ?? name,
            email: res.data.user.email,
            role: "admin",
          },
          res.data.session?.token ?? "",
        );
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] overflow-hidden">
      <Particles
        className="absolute inset-0"
        quantity={40}
        color="#818cf8"
        ease={80}
        size={0.5}
        staticity={50}
        refresh
      />
      <div className="absolute top-1/3 left-1/3 h-[300px] w-[300px] rounded-full bg-[#818cf8]/5 blur-[100px]" />

      <div className="relative w-full max-w-[380px] px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl os-gradient shadow-lg shadow-[#818cf8]/20">
            <IconHammer className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Create account
            </h1>
            <p className="mt-0.5 text-sm text-[#52525b]">
              Get started with OpSmith
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl p-6 glass-strong">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-[#71717a]">Full name</Label>
              <Input
                id="name" type="text" placeholder="Alex Chen"
                value={name} onChange={(e) => setName(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-[#71717a]">Email</Label>
              <Input
                id="email" type="email" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-[#71717a]">Password</Label>
              <Input
                id="password" type="password" placeholder="min. 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-medium text-[#71717a]">Confirm password</Label>
              <Input
                id="confirm" type="password" placeholder="••••••••"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="border-[#27272a] bg-[#111113] text-sm text-white placeholder:text-[#3f3f46]"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 px-3 py-2 text-xs text-[#f87171]">
                {error}
              </p>
            )}

            <Button
              type="submit" disabled={loading}
              className="mt-1 w-full os-gradient text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 border-0 shadow-lg shadow-[#818cf8]/10"
            >
              {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-[#52525b]">
          Already have an account?{" "}
          <Link href="/" className="text-[#818cf8] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

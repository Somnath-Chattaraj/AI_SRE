"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconLoader2, IconShieldCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { useAppStore } from "@/lib/store";

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
    <div className="flex min-h-screen items-center justify-center bg-[hsl(220,13%,7%)]">
      <div className="w-full max-w-[380px] px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(220,13%,18%)] bg-[hsl(220,13%,11%)]">
            <IconShieldCheck className="h-5 w-5 text-[hsl(220,10%,65%)]" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Create account
            </h1>
            <p className="mt-0.5 text-sm text-[hsl(220,10%,42%)]">
              Get started with AutoHeal
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-medium text-[hsl(220,10%,55%)]"
            >
              Full name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)] focus-visible:ring-[hsl(220,10%,30%)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-[hsl(220,10%,55%)]"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)] focus-visible:ring-[hsl(220,10%,30%)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-[hsl(220,10%,55%)]"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)] focus-visible:ring-[hsl(220,10%,30%)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="confirm"
              className="text-xs font-medium text-[hsl(220,10%,55%)]"
            >
              Confirm password
            </Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border-[hsl(220,13%,16%)] bg-[hsl(220,13%,10%)] text-sm text-white placeholder:text-[hsl(220,10%,30%)] focus-visible:ring-[hsl(220,10%,30%)]"
            />
          </div>

          {error && (
            <p className="rounded-md border border-[hsl(0,60%,30%)] bg-[hsl(0,60%,12%)] px-3 py-2 text-xs text-[hsl(0,72%,65%)]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 w-full border border-[hsl(220,13%,22%)] bg-[hsl(220,13%,14%)] text-sm text-white hover:bg-[hsl(220,13%,18%)] disabled:opacity-50"
          >
            {loading ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[hsl(220,10%,38%)]">
          Already have an account?{" "}
          <Link
            href="/"
            className="text-[hsl(220,10%,60%)] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

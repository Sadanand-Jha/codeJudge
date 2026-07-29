'use client';
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "sonner";
import { login } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/guards/AuthGuard";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res.success && res.data?.user) {
        const user = res.data.user as { id: string; email: string; username?: string };
        // Session is stored in httpOnly cookie; keep local auth state in sync
        setAuth("session", user);
        toast.success("Signed in successfully!");
        router.push("/dashboard");
      } else {
        toast.error(res.message || "Invalid credentials");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-sm px-4 py-12">
        <div className="border border-[#E6E7EB] bg-white p-6">
          <h1 className="mb-4 text-lg font-bold text-[#111827] text-center">Sign In</h1>
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Email / Handle</label>
              <input
                type="text"
                className="w-full rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Password</label>
              <input
                type="password"
                className="w-full rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-3 text-center text-[10px] text-[#6B7280]">
            <Link href="/forgot-password" className="text-[#2563EB] hover:underline">Forgot password?</Link>
            <span className="mx-1">·</span>
            <Link href="/register" className="text-[#2563EB] hover:underline">Register</Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

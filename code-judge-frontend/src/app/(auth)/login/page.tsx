"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Mail, Lock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.success && res.data) {
        const { token, user } = res.data as any;
        setAuth(token, user);
        toast.success("Logged in successfully");
        router.push("/");
      } else {
        toast.error(res.data?.message || "Login failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">CodeJudge</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
          <h1 className="text-lg font-bold text-white text-center mb-1">Welcome back</h1>
          <p className="text-xs text-[#9CA3AF] text-center mb-6">Sign in to your account</p>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-[11px] font-medium text-[#9CA3AF] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-[#09090B] border border-white/[0.06] pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#6B7280] outline-none focus:border-[#7C3AED]/40 transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#9CA3AF] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-[#09090B] border border-white/[0.06] pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#6B7280] outline-none focus:border-[#7C3AED]/40 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#6B7280]">
            <Link href="/forgot-password" className="text-[#7C3AED] hover:underline">Forgot password?</Link>
            <span className="mx-1.5">·</span>
            <Link href="/register" className="text-[#7C3AED] hover:underline">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Mail, Lock, User, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { register } from "@/services/auth";
import { toast } from "@/lib/toast";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await register({ username, email, password });
      if (res.success && res.data) {
        const { token, user } = res.data as any;
        setAuth(token, user);
        toast.success("Account created successfully");
        router.push("/");
      } else {
        toast.error(res.data?.message || "Registration failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">ByteClash</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-text-primary text-center mb-1">Create account</h1>
          <p className="text-xs text-text-secondary text-center mb-6">Start your coding journey</p>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="your_username"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
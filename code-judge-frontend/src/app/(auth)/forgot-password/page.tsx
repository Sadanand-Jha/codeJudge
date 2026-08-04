"use client";

import { useState } from "react";
import Link from "next/link";
import { Code2, Mail, Loader2, ArrowLeft } from "lucide-react";
import { forgotPassword } from "@/services/auth";
import { toast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setSending(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent if account exists");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send reset link");
    } finally {
      setSending(false);
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
          <h1 className="text-lg font-bold text-text-primary text-center mb-1">Reset Password</h1>
          <p className="text-xs text-text-secondary text-center mb-6">
            Enter your email to receive a reset link
          </p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-success" />
              </div>
              <p className="text-sm text-text-secondary mb-4">
                If an account with <span className="font-medium text-text-primary">{email}</span> exists, you will receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
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
              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                {sending ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          {!sent && (
            <div className="mt-5 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
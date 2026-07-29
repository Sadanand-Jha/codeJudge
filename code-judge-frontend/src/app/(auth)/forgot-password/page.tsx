"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { validateEmail } from "@/lib/validators";
import AuthGuard from "@/components/guards/AuthGuard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const err = validateEmail(email);
    if (err) {
      toast.error(err);
      return;
    }

    setSending(true);
    try {
      // Simulate API call — replace with actual forgot-password service
      await new Promise((r) => setTimeout(r, 1000));
      toast.success("Reset link sent to your email!");
      setSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send reset link";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-sm px-4 py-12">
      <div className="border border-[#E6E7EB] bg-white p-6">
        <h1 className="mb-4 text-lg font-bold text-[#111827] text-center">Reset Password</h1>
        {sent ? (
          <div className="text-center">
            <p className="mb-2 text-[11px] text-[#6B7280]">
              If an account with <span className="font-medium text-[#111827]">{email}</span> exists, you will receive a password reset link shortly.
            </p>
            <Link href="/login" className="text-[10px] text-[#2563EB] hover:underline">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
        <div className="mt-3 text-center text-[10px] text-[#6B7280]">
          <Link href="/login" className="text-[#2563EB] hover:underline">Back to Sign In</Link>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
}

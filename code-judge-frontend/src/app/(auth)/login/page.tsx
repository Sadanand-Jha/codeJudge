'use client';
import Link from "next/link";
import React, { useState } from "react";

export default function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log(email, password)
  }

  return (
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
              value = {password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            Sign In
          </button>
        </form>
        <div className="mt-3 text-center text-[10px] text-[#6B7280]">
          <Link href="/forgot-password" className="text-[#2563EB] hover:underline">Forgot password?</Link>
          <span className="mx-1">·</span>
          <Link href="/register" className="text-[#2563EB] hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
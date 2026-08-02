"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, UserCheck, Building2, Mail, Trophy, Star } from "lucide-react";
import type { AccessRestrictions } from "@/types/quiz";

interface AccessRestrictionsPanelProps {
  restrictions: AccessRestrictions;
  onChange: (restrictions: AccessRestrictions) => void;
}

export default function AccessRestrictionsPanel({ restrictions, onChange }: AccessRestrictionsPanelProps) {
  const toggle = (field: keyof AccessRestrictions) => {
    onChange({ ...restrictions, [field]: !restrictions[field] });
  };

  const updateString = (field: "inviteCode" | "password", value: string) => {
    onChange({ ...restrictions, [field]: value || undefined });
  };

  const updateNumber = (field: "minXP" | "minRating", value: string) => {
    const num = value === "" ? undefined : Number(value);
    onChange({ ...restrictions, [field]: num });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#EC4899]" />
        <h3 className="text-sm font-semibold text-white">Access Restrictions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
          <input type="checkbox" checked={restrictions.verifiedEmail} onChange={() => toggle("verifiedEmail")} className="h-4 w-4 rounded border-white/20 bg-[#0B0D12] accent-[#EC4899]" />
          <div>
            <p className="text-xs font-semibold text-white">Verified Email Required</p>
            <p className="text-[11px] text-[#9CA3AF]">User must verify their email</p>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
          <input type="checkbox" checked={restrictions.verifiedCollege} onChange={() => toggle("verifiedCollege")} className="h-4 w-4 rounded border-white/20 bg-[#0B0D12] accent-[#EC4899]" />
          <div>
            <p className="text-xs font-semibold text-white">Verified College Required</p>
            <p className="text-[11px] text-[#9CA3AF]">User must verify college ID</p>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
          <input type="checkbox" checked={restrictions.verifiedCompany} onChange={() => toggle("verifiedCompany")} className="h-4 w-4 rounded border-white/20 bg-[#0B0D12] accent-[#EC4899]" />
          <div>
            <p className="text-xs font-semibold text-white">Verified Company Required</p>
            <p className="text-[11px] text-[#9CA3AF]">User must verify employment</p>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
          <input type="checkbox" checked={!!restrictions.inviteCode} onChange={() => toggle("inviteCode")} className="h-4 w-4 rounded border-white/20 bg-[#0B0D12] accent-[#EC4899]" />
          <div>
            <p className="text-xs font-semibold text-white">Invite Code Required</p>
            <p className="text-[11px] text-[#9CA3AF]">Require a valid invite code</p>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
          <input type="checkbox" checked={!!restrictions.password} onChange={() => toggle("password")} className="h-4 w-4 rounded border-white/20 bg-[#0B0D12] accent-[#EC4899]" />
          <div>
            <p className="text-xs font-semibold text-white">Password Protected</p>
            <p className="text-[11px] text-[#9CA3AF]">Quiz requires a password</p>
          </div>
        </label>
      </div>

      {restrictions.inviteCode && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Invite Code</label>
          <input type="text" value={restrictions.inviteCode || ""} onChange={(e) => updateString("inviteCode", e.target.value)} placeholder="Enter invite code" className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none" />
        </div>
      )}

      {restrictions.password && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Password</label>
          <input type="password" value={restrictions.password || ""} onChange={(e) => updateString("password", e.target.value)} placeholder="Enter quiz password" className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Minimum XP</label>
          <input type="number" value={restrictions.minXP ?? ""} onChange={(e) => updateNumber("minXP", e.target.value)} placeholder="e.g. 500" className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Minimum Rating</label>
          <input type="number" value={restrictions.minRating ?? ""} onChange={(e) => updateNumber("minRating", e.target.value)} placeholder="e.g. 1200" className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none" />
        </div>
      </div>
    </motion.div>
  );
}
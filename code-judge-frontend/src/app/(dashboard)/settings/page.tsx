"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings, User, Bell, Palette } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export default function SettingsPage() {
  const [handle, setHandle] = useState("user");
  const [email, setEmail] = useState("user@example.com");
  const [showTags, setShowTags] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!handle.trim()) {
      toast.error("Handle cannot be empty");
      return;
    }
    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Manage your account and preferences.</p>
          </div>

          {/* General Settings */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
              <User className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-white">General</h2>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleSave}>
              <div>
                <label className="block text-[11px] font-medium text-[#9CA3AF] mb-2">Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full max-w-xs rounded-xl bg-[#09090B] border border-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#9CA3AF] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full max-w-xs rounded-xl bg-[#09090B] border border-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]/40 transition-colors"
                />
              </div>
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 text-sm text-[#9CA3AF] cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showTags}
                      onChange={(e) => setShowTags(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-white/[0.06] rounded-full peer-checked:bg-[#7C3AED] transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                  Show tags for unsolved problems
                </label>
                <label className="flex items-center gap-3 text-sm text-[#9CA3AF] cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-white/[0.06] rounded-full peer-checked:bg-[#7C3AED] transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                  Receive email notifications
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

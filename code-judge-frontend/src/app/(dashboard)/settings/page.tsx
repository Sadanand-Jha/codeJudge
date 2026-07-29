"use client";

import { useState } from "react";
import { toast } from "sonner";

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
      // Simulate API call — replace with actual settings update service
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Settings</h1>
      </div>
      <div className="space-y-3">
        <div className="border border-[#E6E7EB] bg-white">
          <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
            <span className="text-[11px] font-medium text-[#2563EB]">→ General</span>
          </div>
          <form className="p-3 space-y-3" onSubmit={handleSave}>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full max-w-xs rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full max-w-xs rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-[#2563EB]"
                  checked={showTags}
                  onChange={(e) => setShowTags(e.target.checked)}
                />
                Show tags for unsolved problems
              </label>
              <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-[#2563EB]"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                Receive email notifications
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1 text-[10px] font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
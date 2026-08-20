"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  Globe,
  Mail,
  MapPin,
  Phone,
  Users,
  Receipt,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, MockDataTag, Panel, StatusBadge, BillButton, SegmentedControl } from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";
import { ORGANIZATION, ORG_MEMBERS } from "./mockData";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-input-bg px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent";

const LABEL_CLS = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary";

const MODES = [
  { id: "individual", label: "Individual" },
  { id: "organization", label: "Organization" },
] as const;

export function CompanyPage() {
  const { success: toastSuccess, info: toastInfo } = useToast();
  const org = ORGANIZATION;
  const [mode, setMode] = useState<"individual" | "organization">(org.mode);

  const [form, setForm] = useState({
    name: org.name,
    tagline: org.tagline,
    description: org.description,
    website: org.website,
    email: org.email,
    phone: org.phone,
    address: org.address,
    city: org.city,
    state: org.state,
    country: org.country,
    businessType: org.businessType,
    gstin: org.gstin,
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () =>
    toastSuccess({ title: "Organization saved", description: "Your organization details were updated." });

  const activeCount = ORG_MEMBERS.filter((m) => m.status === "Active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company / Organization"
        subtitle="Business details, branding and team setup for your creator account."
        badge={<MockDataTag />}
        actions={<BillButton onClick={save}>Save changes</BillButton>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6">
          <Panel title="Account Mode" subtitle="How your creator account operates">
            <SegmentedControl
              size="md"
              options={MODES}
              value={mode}
              onChange={(m) => {
                setMode(m);
                toastInfo({
                  title: m === "organization" ? "Organization mode" : "Individual mode",
                  description:
                    m === "organization"
                      ? "Tests will publish under your company name."
                      : "Tests will publish under your personal name.",
                });
              }}
            />
            <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">
              {mode === "organization"
                ? "Publish and sell tests under your organization's brand. Team members can help manage content and analytics."
                : "Sell as an individual educator. Your personal name and profile will appear on published tests."}
            </p>
          </Panel>

          <Panel title="Team Overview">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{ORG_MEMBERS.length} members</p>
                    <p className="text-[11px] text-text-secondary">{activeCount} active</p>
                  </div>
                </div>
                <Link href="/creator/company/members" className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">
                  Manage
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <Landmark className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">Business type</p>
                    <p className="text-[11px] text-text-secondary">{org.businessType}</p>
                  </div>
                </div>
                <StatusBadge label="Registered" tone="emerald" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">GST status</p>
                    <p className="text-[11px] text-text-secondary">{org.gstin}</p>
                  </div>
                </div>
                <StatusBadge label={org.gstStatus} tone={org.gstStatus === "Registered" ? "emerald" : "amber"} />
              </div>
            </div>
          </Panel>

          <Link
            href="/creator/verification"
            className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-pink-500/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-text-primary">Verification status</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                <Check className="h-3 w-3" />
                Complete
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">Identity, organization and payment verified.</p>
          </Link>
        </div>

        {/* Right column: organization form */}
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Organization Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Organization name</label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input className={cn(INPUT_CLS, "pl-9")} value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Tagline</label>
                <input className={INPUT_CLS} value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  className={cn(INPUT_CLS, "min-h-24 resize-none")}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Website</label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input className={cn(INPUT_CLS, "pl-9")} value={form.website} onChange={(e) => update("website", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Contact email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input className={cn(INPUT_CLS, "pl-9")} value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Contact phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input className={cn(INPUT_CLS, "pl-9")} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Business type</label>
                <input className={INPUT_CLS} value={form.businessType} onChange={(e) => update("businessType", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Address</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
                  <textarea
                    className={cn(INPUT_CLS, "min-h-16 resize-none pl-9")}
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>City</label>
                <input className={INPUT_CLS} value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>State</label>
                <input className={INPUT_CLS} value={form.state} onChange={(e) => update("state", e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Country</label>
                <input className={INPUT_CLS} value={form.country} onChange={(e) => update("country", e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>GSTIN</label>
                <input className={cn(INPUT_CLS, "font-mono tracking-wider")} value={form.gstin} onChange={(e) => update("gstin", e.target.value)} />
              </div>
            </div>
          </Panel>

          <Panel title="Branding" subtitle="Logo and visual identity">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white/[0.02] text-2xl font-bold text-text-muted">
                {org.logo ?? form.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-40">
                <p className="text-[13px] font-semibold text-text-primary">Organization logo</p>
                <p className="mt-0.5 text-[11px] text-text-secondary">
                  Shown on your public profile and published tests. PNG or SVG, max 2MB.
                </p>
                <BillButton
                  variant="ghost"
                  className="mt-3"
                  onClick={() => toastInfo({ title: "Preview mode", description: "Uploads are disabled in this preview." })}
                >
                  Upload logo
                </BillButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { History, Save, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type CouponUpdate,
  type PlatformCoupon,
  type PlatformPlan,
  type PlatformVersion,
} from "@/services/platform";
import { BTN, BTN_DANGER, BTN_PRI, DraftBadge, Field, INPUT, VersionHistory } from "./admin-ui";

type CouponDraft = Partial<CouponUpdate>;

function draftOf(coupon: PlatformCoupon): CouponDraft | null {
  return coupon.draft_payload as CouponDraft | null;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CouponEditor({
  coupon,
  plans,
  onRefresh,
  onCreated,
  onDeleted,
  previewMode = false,
}: {
  coupon: PlatformCoupon | null;
  plans: PlatformPlan[];
  onRefresh: () => Promise<void>;
  onCreated: (couponId: number) => void;
  onDeleted: () => void;
  previewMode?: boolean;
}) {
  const toast = useToast();
  const draft = coupon ? draftOf(coupon) : null;
  const isPreview = previewMode;
  const [code, setCode] = useState(draft?.code ?? coupon?.code ?? "");
  const [type, setType] = useState<PlatformCoupon["type"]>(draft?.type ?? coupon?.type ?? "percent");
  const [value, setValue] = useState(String(draft?.value ?? coupon?.value ?? 10));
  const [maxRedemptions, setMaxRedemptions] = useState(
    draft?.max_redemptions != null ? String(draft.max_redemptions) : coupon?.max_redemptions != null ? String(coupon.max_redemptions) : ""
  );
  const [perUserLimit, setPerUserLimit] = useState(String(draft?.per_user_limit ?? coupon?.per_user_limit ?? 1));
  const [validFrom, setValidFrom] = useState(toLocalInput(draft?.valid_from ?? coupon?.valid_from));
  const [validUntil, setValidUntil] = useState(toLocalInput(draft?.valid_until ?? coupon?.valid_until));
  const [planIds, setPlanIds] = useState<number[]>(draft?.applies_to_plan_ids ?? coupon?.applies_to_plan_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versions, setVersions] = useState<PlatformVersion[]>([]);
  const [restoring, setRestoring] = useState(false);

  const buildPayload = (): CouponUpdate | null => {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{2,64}$/.test(cleanCode)) {
      toast.error({ title: "Invalid coupon code", description: "Use 2–64 letters, numbers, dashes or underscores." });
      return null;
    }
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0 || (type === "percent" && numericValue > 100)) {
      toast.error({ title: "Invalid value", description: type === "percent" ? "Percent must be 1–100." : "Value must be a positive whole number." });
      return null;
    }
    const max = maxRedemptions.trim() ? Number(maxRedemptions) : null;
    if (max !== null && (!Number.isInteger(max) || max < 1)) {
      toast.error({ title: "Invalid max redemptions", description: "Leave blank for unlimited, or use a positive whole number." });
      return null;
    }
    const perUser = Number(perUserLimit);
    if (!Number.isInteger(perUser) || perUser < 1) {
      toast.error({ title: "Invalid per-user limit", description: "Must be at least 1." });
      return null;
    }
    const from = toIso(validFrom);
    const until = toIso(validUntil);
    if (from && until && new Date(until) < new Date(from)) {
      toast.error({ title: "Invalid dates", description: "Valid until must be after valid from." });
      return null;
    }
    return {
      code: cleanCode,
      type,
      value: numericValue,
      applies_to_plan_ids: planIds.length > 0 ? planIds : null,
      max_redemptions: max,
      per_user_limit: perUser,
      valid_from: from,
      valid_until: until,
    };
  };

  const create = async (payload: CouponUpdate): Promise<PlatformCoupon | null> => {
    if (isPreview) return null;
    try {
      const created = await platformApi.createCoupon(payload);
      toast.success({ title: "Coupon created as draft", description: "Publish it when you are ready." });
      await onRefresh();
      onCreated(created.id);
      return created;
    } catch (error) {
      toast.error({ title: "Coupon could not be created", description: getApiErrorMessage(error, "Check the code and values.") });
      return null;
    }
  };

  const saveDraft = async (silent = false): Promise<boolean> => {
    if (isPreview || saving) return false;
    const payload = buildPayload();
    if (!payload) return false;
    setSaving(true);
    try {
      if (!coupon) {
        const created = await create(payload);
        return Boolean(created);
      }
      await platformApi.saveCouponDraft(coupon.id, payload);
      if (!silent) toast.success({ title: "Coupon draft saved", description: "Nothing is live until you publish." });
      await onRefresh();
      return true;
    } catch (error) {
      toast.error({ title: "Coupon draft could not be saved", description: getApiErrorMessage(error, "Try again.") });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (isPreview || saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (!coupon) {
        const created = await create(payload);
        if (!created) return;
        await platformApi.publishCouponDraft(created.id);
        await onRefresh();
        onCreated(created.id);
      } else {
        await platformApi.saveCouponDraft(coupon.id, payload);
        await platformApi.publishCouponDraft(coupon.id);
        await onRefresh();
      }
      toast.success({ title: "Coupon published", description: `${payload.code} is live.` });
    } catch (error) {
      toast.error({ title: "Coupon could not be published", description: getApiErrorMessage(error, "Check the code and values.") });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (isPreview || !coupon || saving) return;
    setSaving(true);
    try {
      await platformApi.toggleCoupon(coupon.id, coupon.status !== "active");
      toast.success({ title: coupon.status === "active" ? "Coupon disabled" : "Coupon activated" });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Coupon status could not change", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (isPreview || !coupon || saving) return;
    if (!window.confirm(`Disable ${coupon.code}? Redemption history is kept.`)) return;
    setSaving(true);
    try {
      await platformApi.disableCoupon(coupon.id);
      toast.success({ title: "Coupon disabled" });
      onDeleted();
    } catch (error) {
      toast.error({ title: "Coupon could not be disabled", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    if (isPreview || !coupon) return;
    setHistoryOpen((open) => !open);
    if (historyOpen) return;
    setHistoryLoading(true);
    try {
      const response = await platformApi.couponVersions(coupon.id);
      setVersions(response.versions);
    } catch (error) {
      toast.error({ title: "History unavailable", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setHistoryLoading(false);
    }
  };

  const restore = async (versionId: number) => {
    if (isPreview || !coupon || restoring) return;
    setRestoring(true);
    try {
      await platformApi.restoreCouponVersion(coupon.id, versionId);
      toast.success({ title: "Version restored as draft", description: "Review it, then publish." });
      await onRefresh();
      const response = await platformApi.couponVersions(coupon.id);
      setVersions(response.versions);
    } catch (error) {
      toast.error({ title: "Version could not be restored", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-[var(--qs-ink)]">{coupon ? coupon.code : "New coupon"}</h3>
          {coupon && <DraftBadge hasDraft={Boolean(coupon.draft_payload)} />}
          {coupon && (
            <span className="rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--qs-muted)]">
              {coupon.status}
            </span>
          )}
          {coupon && <span className="text-[11px] font-bold text-[var(--qs-muted)]">{coupon.redemption_count} redeemed</span>}
        </div>
        {coupon && (
          <button type="button" className={BTN} onClick={loadHistory} disabled={saving || isPreview}>
            <History size={14} />
            Version history
          </button>
        )}
      </div>

      {historyOpen && (
        <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
          <VersionHistory versions={versions} loading={historyLoading} onRestore={restore} busy={restoring} />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Code">
          <input className={INPUT} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SAVE20" />
        </Field>
        <Field label="Type">
          <select className={INPUT} value={type} onChange={(event) => setType(event.target.value as PlatformCoupon["type"])}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat ₹ off</option>
            <option value="free_days">Free days</option>
          </select>
        </Field>
        <Field label={type === "percent" ? "Percent (1–100)" : type === "flat" ? "Flat amount" : "Free days"}>
          <input className={INPUT} type="number" min={1} max={type === "percent" ? 100 : undefined} step={1} value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Max redemptions" hint="Leave blank for unlimited.">
          <input className={INPUT} type="number" min={1} step={1} value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} />
        </Field>
        <Field label="Per-user limit">
          <input className={INPUT} type="number" min={1} step={1} value={perUserLimit} onChange={(event) => setPerUserLimit(event.target.value)} />
        </Field>
        <div />
        <Field label="Valid from">
          <input className={INPUT} type="datetime-local" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
        </Field>
        <Field label="Valid until">
          <input className={INPUT} type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
        </Field>
      </div>

      <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
        <p className="text-[12px] font-extrabold text-[var(--qs-ink)]">Applies to plans</p>
        <p className="mb-2 text-[11px] text-[var(--qs-muted)]">Leave every box unchecked to apply to all plans.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((plan) => (
            <label key={plan.id} className="flex items-center gap-2 text-[12px] font-bold text-[var(--qs-ink)]">
              <input
                type="checkbox"
                checked={planIds.includes(plan.id)}
                onChange={(event) =>
                  setPlanIds((ids) =>
                    event.target.checked ? [...ids, plan.id] : ids.filter((id) => id !== plan.id)
                  )
                }
                className="h-4 w-4 accent-[var(--qs-brand)]"
              />
              {plan.name}
              <span className="text-[10px] font-semibold text-[var(--qs-muted)]">{plan.status}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_PRI} onClick={publish} disabled={saving || isPreview}>
          <Send size={14} />
          Publish
        </button>
        <button type="button" className={BTN} onClick={() => void saveDraft()} disabled={saving || isPreview}>
          <Save size={14} />
          Save draft
        </button>
        {coupon && (
          <>
            <button type="button" className={BTN} onClick={toggleActive} disabled={saving || isPreview}>
              {coupon.status === "active" ? "Disable" : "Activate"}
            </button>
            <button type="button" className={BTN_DANGER} onClick={disable} disabled={saving || isPreview}>
              <Trash2 size={14} />
              Disable coupon
            </button>
          </>
        )}
      </div>
    </div>
  );
}

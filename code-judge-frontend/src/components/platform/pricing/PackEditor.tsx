"use client";

import { useEffect, useState } from "react";
import { Copy, History, Save, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type CreditPackUpdate,
  type PlatformCreditPack,
  type PlatformVersion,
} from "@/services/platform";
import { BTN, BTN_DANGER, BTN_PRI, DraftBadge, Field, INPUT, Toggle, VersionHistory } from "./admin-ui";
import type { PreviewPack } from "./PricingPreview";

type PackDraft = Partial<CreditPackUpdate>;

function draftOf(pack: PlatformCreditPack): PackDraft | null {
  return pack.draft_payload as PackDraft | null;
}

export function PackEditor({
  pack,
  onRefresh,
  onDeleted,
  onPreview,
  previewMode = false,
}: {
  pack: PlatformCreditPack;
  onRefresh: () => Promise<void>;
  onDeleted: () => void;
  onPreview: (pack: PreviewPack) => void;
  previewMode?: boolean;
}) {
  const toast = useToast();
  const draft = draftOf(pack);
  const isPreview = previewMode;
  const [code, setCode] = useState(draft?.code ?? pack.code);
  const [name, setName] = useState(draft?.name ?? pack.name);
  const [price, setPrice] = useState(String(draft?.price_inr ?? pack.price_inr));
  const [credits, setCredits] = useState(String(draft?.credits ?? pack.credits));
  const [validityDays, setValidityDays] = useState(String(draft?.validity_days ?? pack.validity_days));
  const [description, setDescription] = useState(draft?.description ?? pack.description ?? "");
  const [cta, setCta] = useState(draft?.cta ?? pack.cta ?? "");
  const [savePercent, setSavePercent] = useState(String(draft?.save_percent ?? pack.save_percent));
  const [sortOrder, setSortOrder] = useState(String(draft?.sort_order ?? pack.sort_order));
  const [popular, setPopular] = useState(draft?.is_popular ?? pack.is_popular);
  const [active, setActive] = useState(draft?.is_active ?? pack.is_active);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versions, setVersions] = useState<PlatformVersion[]>([]);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    onPreview({
      id: String(pack.id),
      name,
      credits: Number(credits) || 0,
      price: Number(price) || 0,
      cta: cta.trim() || "Buy credits",
      blurb: description,
      popular,
      validityMonths: Math.max(1, Math.round((Number(validityDays) || 30) / 30)),
      savePercent: Number(savePercent) || 0,
    });
  }, [credits, cta, description, onPreview, pack.id, popular, price, savePercent, name, validityDays]);

  const buildPayload = (): CreditPackUpdate | null => {
    if (!name.trim() || !code.trim()) {
      toast.error({ title: "Name and code are required", description: "Both identify the pack." });
      return null;
    }
    const numericPrice = Number(price);
    const numericCredits = Number(credits);
    const numericDays = Number(validityDays);
    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      toast.error({ title: "Invalid price", description: "Price must be a whole number." });
      return null;
    }
    if (!Number.isInteger(numericCredits) || numericCredits <= 0) {
      toast.error({ title: "Invalid credits", description: "Credits must be a positive whole number." });
      return null;
    }
    if (!Number.isInteger(numericDays) || numericDays <= 0) {
      toast.error({ title: "Invalid validity", description: "Validity must be a positive whole number of days." });
      return null;
    }
    return {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      price_inr: numericPrice,
      credits: numericCredits,
      validity_days: numericDays,
      description: description.trim() || null,
      is_popular: popular,
      save_percent: Math.min(100, Math.max(0, Number(savePercent) || 0)),
      is_active: active,
      cta: cta.trim() || null,
      sort_order: Number(sortOrder) || 0,
    };
  };

  const saveDraft = async (silent = false): Promise<boolean> => {
    if (isPreview || saving) return false;
    const payload = buildPayload();
    if (!payload) return false;
    setSaving(true);
    try {
      await platformApi.saveCreditPackDraft(pack.id, payload);
      if (!silent) toast.success({ title: "Pack draft saved", description: "Publish when the preview looks right." });
      await onRefresh();
      return true;
    } catch (error) {
      toast.error({ title: "Pack draft could not be saved", description: getApiErrorMessage(error, "Check the fields and try again.") });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (isPreview || saving) return;
    const saved = await saveDraft(true);
    if (!saved) return;
    setSaving(true);
    try {
      await platformApi.publishCreditPackDraft(pack.id);
      toast.success({ title: "Pack published", description: `${name} is live.` });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Pack could not be published", description: getApiErrorMessage(error, "Fix the fields and try again.") });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (isPreview || saving) return;
    setSaving(true);
    try {
      const baseCode = code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || "pack";
      const copyName = `${name} copy`.slice(0, 50);
      let suffix = 2;
      let nextCode = `${baseCode}-copy`.slice(0, 20);
      while (suffix < 20) {
        try {
          await platformApi.createCreditPack({
            code: nextCode,
            name: copyName,
            price_inr: Number(price) || 0,
            credits: Number(credits) || 1,
            validity_days: Number(validityDays) || 30,
            description: description.trim() || null,
            is_popular: false,
            save_percent: Number(savePercent) || 0,
            is_active: false,
            cta: cta.trim() || null,
            sort_order: Number(sortOrder) + 1,
          });
          break;
        } catch (error) {
          const message = getApiErrorMessage(error, "");
          if (!message.toLowerCase().includes("already")) throw error;
          suffix += 1;
          nextCode = `${baseCode}-c${suffix}`.slice(0, 20);
        }
      }
      toast.success({ title: "Pack duplicated", description: "The copy is inactive until you publish it." });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Pack could not be duplicated", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (isPreview || saving) return;
    setSaving(true);
    try {
      await platformApi.toggleCreditPack(pack.id, !pack.is_active);
      toast.success({ title: pack.is_active ? "Pack paused" : "Pack activated" });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Pack status could not change", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isPreview || saving) return;
    if (!window.confirm(`Deactivate ${pack.name}? It will leave the public catalog; existing purchases keep their credits.`)) return;
    setSaving(true);
    try {
      await platformApi.deleteCreditPack(pack.id);
      toast.success({ title: "Pack deleted" });
      onDeleted();
    } catch (error) {
      toast.error({ title: "Pack could not be deleted", description: getApiErrorMessage(error, "Pause it instead.") });
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    if (isPreview) return;
    setHistoryOpen((open) => !open);
    if (historyOpen) return;
    setHistoryLoading(true);
    try {
      const response = await platformApi.creditPackVersions(pack.id);
      setVersions(response.versions);
    } catch (error) {
      toast.error({ title: "History unavailable", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setHistoryLoading(false);
    }
  };

  const restore = async (versionId: number) => {
    if (isPreview || restoring) return;
    setRestoring(true);
    try {
      await platformApi.restoreCreditPackVersion(pack.id, versionId);
      toast.success({ title: "Version restored as draft", description: "Review it, then publish." });
      await onRefresh();
      const response = await platformApi.creditPackVersions(pack.id);
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
          <h3 className="text-lg font-black text-[var(--qs-ink)]">{pack.name}</h3>
          <DraftBadge hasDraft={Boolean(pack.draft_payload)} />
          <span className="rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--qs-muted)]">
            {pack.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <button type="button" className={BTN} onClick={loadHistory} disabled={saving || isPreview}>
          <History size={14} />
          Version history
        </button>
      </div>

      {historyOpen && (
        <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
          <VersionHistory versions={versions} loading={historyLoading} onRestore={restore} busy={restoring} />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pack name">
          <input className={INPUT} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Code" hint="Unique, uppercase. Avoid changing after launch.">
          <input className={INPUT} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
        </Field>
        <Field label="Price (₹)">
          <input className={INPUT} type="number" min={0} step={1} value={price} onChange={(event) => setPrice(event.target.value)} />
        </Field>
        <Field label="Credits">
          <input className={INPUT} type="number" min={1} step={1} value={credits} onChange={(event) => setCredits(event.target.value)} />
        </Field>
        <Field label="Validity (days)">
          <input className={INPUT} type="number" min={1} step={1} value={validityDays} onChange={(event) => setValidityDays(event.target.value)} />
        </Field>
        <Field label="Save %">
          <input className={INPUT} type="number" min={0} max={100} step={1} value={savePercent} onChange={(event) => setSavePercent(event.target.value)} />
        </Field>
        <Field label="CTA">
          <input className={INPUT} value={cta} onChange={(event) => setCta(event.target.value)} placeholder="Buy credits" />
        </Field>
        <Field label="Sort order">
          <input className={INPUT} type="number" step={1} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        </Field>
      </div>

      <Field label="Description">
        <textarea className={`${INPUT} min-h-20`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <Toggle label="Popular badge" checked={popular} onChange={setPopular} />
        <Toggle label="Active" checked={active} onChange={setActive} />
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
        <button type="button" className={BTN} onClick={toggleActive} disabled={saving || isPreview}>
          {pack.is_active ? "Pause" : "Activate"}
        </button>
        <button type="button" className={BTN} onClick={duplicate} disabled={saving || isPreview}>
          <Copy size={14} />
          Duplicate
        </button>
        <button type="button" className={BTN_DANGER} onClick={remove} disabled={saving || isPreview}>
          <Trash2 size={14} />
          Deactivate
        </button>
        <span className="ml-auto text-[11px] text-[var(--qs-muted)]">Updated {new Date(pack.created_at).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

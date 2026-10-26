"use client";

import { useEffect, useMemo, useState } from "react";
import { History, RotateCcw, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import { platformApi, type PlatformPageContent, type PlatformVersion } from "@/services/platform";
import { BTN, BTN_PRI, DraftBadge, INPUT, VersionHistory } from "./admin-ui";

const FIELDS: { key: string; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "plans_banner", label: "Plans banner", hint: "Small strip above the heading." },
  { key: "plans_heading", label: "Plans heading" },
  { key: "plans_subheading", label: "Plans subheading", multiline: true },
  { key: "plans_gst_note", label: "GST note" },
  { key: "credits_heading", label: "Credits heading" },
  { key: "credits_subheading", label: "Credits subheading", multiline: true },
];

function valueFromVersion(version: PlatformVersion, key: string): string | null {
  const after = version.after as unknown;
  if (after && typeof after === "object") {
    const record = after as Record<string, unknown>;
    if (typeof record[key] === "string") return record[key] as string;
    const changed = record.changed;
    if (Array.isArray(changed)) {
      const entry = changed.find(
        (item) => item && typeof item === "object" && (item as Record<string, unknown>).key === key
      ) as Record<string, unknown> | undefined;
      if (entry && typeof entry.after === "string") return entry.after;
    }
  }
  const before = version.before as unknown;
  if (before && typeof before === "object") {
    const record = before as Record<string, unknown>;
    if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
}

function valuesFromRows(rows: PlatformPageContent[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const row of rows) next[row.key] = row.draft_value ?? row.value;
  return next;
}

export function ContentEditor({
  content,
  onRefresh,
  onPreview,
  previewMode = false,
}: {
  content: PlatformPageContent[];
  onRefresh: () => Promise<void>;
  onPreview: (content: Record<string, string>) => void;
  previewMode?: boolean;
}) {
  const toast = useToast();
  const isPreview = previewMode;
  const byKey = useMemo(() => new Map(content.map((row) => [row.key, row])), [content]);
  const [values, setValues] = useState<Record<string, string>>(() => valuesFromRows(content));
  const [saving, setSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versions, setVersions] = useState<PlatformVersion[]>([]);

  useEffect(() => {
    onPreview(values);
  }, [onPreview, values]);

  const rows = useMemo<{ key: string; label: string; hint?: string; multiline?: boolean }[]>(() => {
    const known = new Set(FIELDS.map((field) => field.key));
    const extra = content
      .filter((row) => !known.has(row.key))
      .map((row) => ({ key: row.key, label: row.key }));
    return [...FIELDS, ...extra];
  }, [content]);

  const dirtyKeys = useMemo(() => {
    return Object.keys(values).filter((key) => values[key] !== (byKey.get(key)?.value ?? ""));
  }, [byKey, values]);

  const hasDraft = content.some((row) => row.draft_value !== null);

  const saveDraft = async (silent = false): Promise<boolean> => {
    if (isPreview || saving) return false;
    if (dirtyKeys.length === 0 && values && Object.keys(values).length > 0) {
      if (!silent) toast.success({ title: "No changes to save", description: "Edit a field first." });
      return true;
    }
    setSaving(true);
    try {
      await platformApi.savePageContentDraft(values);
      if (!silent) toast.success({ title: "Content draft saved", description: "Publish when the preview looks right." });
      await onRefresh();
      return true;
    } catch (error) {
      toast.error({ title: "Content draft could not be saved", description: getApiErrorMessage(error, "Try again.") });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (isPreview || saving) return;
    setSaving(true);
    try {
      await platformApi.savePageContentDraft(values);
      await platformApi.publishPageContent(Object.keys(values));
      toast.success({ title: "Page content published", description: "The public pricing pages now use these values." });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Content could not be published", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (key: string) => {
    if (isPreview) return;
    if (historyKey === key) {
      setHistoryKey(null);
      return;
    }
    setHistoryKey(key);
    setHistoryLoading(true);
    try {
      const response = await platformApi.pageContentVersions(key);
      setVersions(response.versions);
    } catch (error) {
      toast.error({ title: "History unavailable", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setHistoryLoading(false);
    }
  };

  const restore = (versionId: number) => {
    if (!historyKey) return;
    const version = versions.find((row) => row.id === versionId);
    if (!version) return;
    const value = valueFromVersion(version, historyKey);
    if (value === null) {
      toast.error({ title: "No value in this version", description: "Choose a different version." });
      return;
    }
    setValues((current) => ({ ...current, [historyKey]: value }));
    toast.success({ title: "Old value loaded into the editor", description: "Save draft, then publish to make it live." });
  };

  const resetToLive = () => {
    const next: Record<string, string> = {};
    for (const row of content) next[row.key] = row.value;
    setValues(next);
    toast.success({ title: "Editor reset to live values" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-[var(--qs-ink)]">Pricing page content</h3>
          <DraftBadge hasDraft={hasDraft} />
          <span className="text-[11px] font-bold text-[var(--qs-muted)]">
            {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
          </span>
        </div>
        <button type="button" className={BTN} onClick={resetToLive} disabled={saving}>
          <RotateCcw size={14} />
          Reset to live
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((field) => {
          const row = byKey.get(field.key);
          const value = values[field.key] ?? "";
          const dirty = row ? value !== row.value : false;
          return (
            <div key={field.key} className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-extrabold text-[var(--qs-ink)]">{field.label}</p>
                  {dirty && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-700">
                      Unsaved
                    </span>
                  )}
                </div>
                <button type="button" className={BTN} onClick={() => void openHistory(field.key)} disabled={saving || isPreview}>
                  <History size={12} />
                  History
                </button>
              </div>
              {field.multiline ? (
                <textarea
                  className={`${INPUT} min-h-20`}
                  value={value}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              ) : (
                <input
                  className={INPUT}
                  value={value}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              )}
              {field.hint && <p className="mt-1 text-[11px] text-[var(--qs-muted)]">{field.hint}</p>}
              {historyKey === field.key && (
                <div className="mt-3 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-2">
                  <VersionHistory versions={versions} loading={historyLoading} onRestore={restore} busy={saving} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_PRI} onClick={publish} disabled={saving || isPreview}>
          <Send size={14} />
          Publish content
        </button>
        <button type="button" className={BTN} onClick={() => void saveDraft()} disabled={saving || isPreview}>
          <Save size={14} />
          Save draft
        </button>
      </div>
    </div>
  );
}

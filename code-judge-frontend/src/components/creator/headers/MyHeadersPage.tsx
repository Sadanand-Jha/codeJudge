"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CloudUpload,
  Crown,
  FileImage,
  Loader2,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { useMySubscription } from "@/hooks/useMySubscription";
import { LETTERHEAD_MAX_PER_USER } from "@/config/letterheads";
import { canUseCustomHeader } from "@/lib/planAccess";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";
import { showCustomHeaderUpgrade } from "@/lib/customHeaderUpgrade";
import {
  LETTERHEADS_CHANGED_EVENT,
  deleteLetterhead,
  listLetterheads,
  notifyLetterheadsChanged,
  updateLetterhead,
  type LetterheadListResponse,
} from "@/services/letterheads";
import { normalizeHeaderConfig } from "@/utils/letterheadLayout";
import type { HeaderConfig, Letterhead } from "@/types/letterhead";
import { AdjustHeaderDialog } from "@/components/letterheads/AdjustHeaderDialog";
import { LetterheadCard } from "@/components/letterheads/LetterheadCard";
import { UploadLetterheadDialog } from "@/components/letterheads/UploadLetterheadDialog";

interface EditingHeader {
  letterhead: Letterhead;
  name: string;
  config: HeaderConfig;
}

export function MyHeadersPage() {
  const { subscription, isLoading: planLoading } = useMySubscription();
  const isPro = canUseCustomHeader(subscription);
  const [data, setData] = useState<LetterheadListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<EditingHeader | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<{ letterhead: Letterhead; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Letterhead | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listLetterheads();
      setData(result);
      setError(null);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Could not load your headers."));
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    let cancelled = false;
    listLetterheads()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getApiErrorMessage(reason, "Could not load your headers."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onChanged = () => void refresh();
    window.addEventListener(LETTERHEADS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(LETTERHEADS_CHANGED_EVENT, onChanged);
    };
  }, [refresh]);

  const letterheads = data?.letterheads ?? [];
  const usage = data?.usage;
  const atLimit = Boolean(usage && usage.count >= usage.max);

  const openUpload = () => {
    if (!isPro) {
      showCustomHeaderUpgrade();
      return;
    }
    if (atLimit) {
      toast.info({
        title: "Header limit reached",
        description: `You can save up to ${usage?.max ?? LETTERHEAD_MAX_PER_USER} headers. Delete one first.`,
      });
      return;
    }
    setUploadOpen(true);
  };

  const setDefault = async (letterhead: Letterhead) => {
    if (!isPro) {
      showCustomHeaderUpgrade();
      return;
    }
    if (letterhead.isDefault) return;
    setSavingId(letterhead.id);
    try {
      await updateLetterhead(letterhead.id, { isDefault: true });
      setData((current) =>
        current
          ? {
              ...current,
              letterheads: current.letterheads.map((item) => ({
                ...item,
                isDefault: item.id === letterhead.id,
              })),
            }
          : current
      );
      notifyLetterheadsChanged();
      toast.success(`"${letterhead.name}" is now your default header.`);
    } catch (reason) {
      toast.error({
        title: "Could not set default",
        description: getApiErrorMessage(reason, "Please try again."),
      });
    } finally {
      setSavingId(null);
    }
  };

  const saveAdjustment = async () => {
    if (!editing || savingId !== null) return;
    if (!editing.name.trim()) {
      toast.error("Give this header a name.");
      return;
    }
    setSavingId(editing.letterhead.id);
    try {
      const config = normalizeHeaderConfig(
        editing.config,
        editing.letterhead.cloudinary.width,
        editing.letterhead.cloudinary.height
      );
      const updated = await updateLetterhead(editing.letterhead.id, {
        name: editing.name.trim(),
        headerConfig: config,
      });
      setData((current) =>
        current
          ? {
              ...current,
              letterheads: current.letterheads.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : current
      );
      setEditing(null);
      notifyLetterheadsChanged();
      toast.success("Header placement saved.");
    } catch (reason) {
      toast.error({
        title: "Could not save placement",
        description: getApiErrorMessage(reason, "Please try again."),
      });
    } finally {
      setSavingId(null);
    }
  };

  const saveRename = async () => {
    if (!renaming || savingId !== null) return;
    const name = renaming.name.trim();
    if (!name) {
      toast.error("Give this header a name.");
      return;
    }
    setSavingId(renaming.letterhead.id);
    try {
      const updated = await updateLetterhead(renaming.letterhead.id, { name });
      setData((current) =>
        current
          ? {
              ...current,
              letterheads: current.letterheads.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : current
      );
      setRenaming(null);
      notifyLetterheadsChanged();
      toast.success("Header renamed.");
    } catch (reason) {
      toast.error({
        title: "Could not rename header",
        description: getApiErrorMessage(reason, "Please try again."),
      });
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    try {
      await deleteLetterhead(deleting.id);
      setDeleting(null);
      notifyLetterheadsChanged();
      toast.success(`"${deleting.name}" was deleted.`);
      await refresh();
    } catch (reason) {
      toast.error({
        title: "Could not delete header",
        description: getApiErrorMessage(reason, "Please try again."),
      });
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">
              My Headers
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#1a1240]">
              <Crown className="h-3 w-3" />
              Pro
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--qs-muted)]">
            Save your institute&apos;s letterhead and place it above the questions on every
            question paper PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {usage && (
            <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-muted)]">
              {usage.count}/{usage.max} used
            </span>
          )}
          <button
            type="button"
            onClick={openUpload}
            disabled={planLoading}
            className="b b-pri gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloudUpload className="h-4 w-4" />
            Upload header
          </button>
        </div>
      </div>

      {!planLoading && !isPro && (
        <div className="flex flex-col justify-between gap-3 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-4 text-[#1a1240] sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[#1a1240] bg-white/60">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold">Custom letterheads are a Pro feature</p>
              <p className="mt-0.5 text-xs font-semibold opacity-80">
                Your saved headers stay safe. Upgrade to add, adjust or use them again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => showCustomHeaderUpgrade()}
            className="b sm shrink-0 gap-1.5 border-[#1a1240] bg-[#1a1240] text-white"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading headers">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
          <h2 className="text-lg font-extrabold text-[var(--qs-ink)]">Could not load your headers</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">{error}</p>
          <button type="button" onClick={() => void load(true)} className="b b-pri mx-auto mt-5 gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : letterheads.length === 0 ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <FileImage className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-[var(--qs-ink)]">No headers yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">
            Upload your college letterhead as a PDF, PNG or JPG. We&apos;ll help you crop and
            place it on the A4 page.
          </p>
          <button type="button" onClick={openUpload} className="b b-pri mx-auto mt-5 gap-1.5">
            {isPro ? <CloudUpload className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {isPro ? "Upload your first header" : "Unlock with Pro"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {letterheads.map((letterhead) => (
            <LetterheadCard
              key={letterhead.id}
              letterhead={letterhead}
              locked={!isPro}
              busy={savingId === letterhead.id}
              onSetDefault={() => void setDefault(letterhead)}
              onAdjust={() =>
                setEditing({
                  letterhead,
                  name: letterhead.name,
                  config: letterhead.headerConfig,
                })
              }
              onRename={() => setRenaming({ letterhead, name: letterhead.name })}
              onDelete={() => setDeleting(letterhead)}
              onUpgrade={() => showCustomHeaderUpgrade()}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] font-semibold text-[var(--qs-muted)]">
        PDF uploads use page 1 only. For best print quality, upload an image at least 1200px
        wide. Headers are stored securely and are only available to your account.
      </p>

      {uploadOpen && (
        <UploadLetterheadDialog
          onClose={() => setUploadOpen(false)}
          onSaved={() => {
            setUploadOpen(false);
            notifyLetterheadsChanged();
            void refresh();
          }}
        />
      )}

      {editing && (
        <AdjustHeaderDialog
          title="Adjust header placement"
          description="Changes update the first-page preview and every future PDF."
          imageUrl={editing.letterhead.cloudinary.pngUrl}
          imageWidth={editing.letterhead.cloudinary.width}
          imageHeight={editing.letterhead.cloudinary.height}
          config={editing.config}
          name={editing.name}
          onChange={(config) => setEditing((current) => (current ? { ...current, config } : current))}
          onNameChange={(name) => setEditing((current) => (current ? { ...current, name } : current))}
          onClose={() => setEditing(null)}
          onSave={() => void saveAdjustment()}
          saving={savingId !== null}
          saveLabel="Save placement"
        />
      )}

      {renaming && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-header-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <h2 id="rename-header-title" className="text-base font-extrabold text-[var(--qs-ink)]">
                Rename header
              </h2>
              <button
                type="button"
                onClick={() => setRenaming(null)}
                disabled={savingId !== null}
                className="b b-icon sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <input
                type="text"
                autoFocus
                maxLength={60}
                value={renaming.name}
                onChange={(event) =>
                  setRenaming((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveRename();
                }}
                className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
              />
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <button type="button" onClick={() => setRenaming(null)} className="b sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveRename()}
                disabled={savingId !== null || !renaming.name.trim()}
                className="b b-pri sm gap-1.5 disabled:opacity-50"
              >
                {savingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-header-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
            <div className="px-5 py-5">
              <h2 id="delete-header-title" className="text-base font-extrabold text-[var(--qs-ink)]">
                Delete &quot;{deleting.name}&quot;?
              </h2>
              <p className="mt-1 text-sm text-[var(--qs-muted)]">
                The file is removed from storage and cannot be restored. Existing downloaded
                PDFs are not affected.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <button type="button" onClick={() => setDeleting(null)} className="b sm">
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletingBusy}
                className="b sm gap-1.5 bg-[var(--qs-bad)] text-white disabled:opacity-50"
              >
                {deletingBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete header
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

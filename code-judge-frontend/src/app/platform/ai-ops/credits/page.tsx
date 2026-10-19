"use client";

import React, { useMemo, useState } from "react";
import { CircleDollarSign, Coins, Gift, Pencil, Plus, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  CREDIT_METRICS,
  CREDIT_PACKAGES,
  CREDIT_TRANSACTIONS,
  type CreditPackage,
  type CreditTransaction,
  type TransactionType,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  BarList,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  Modal,
  SearchInput,
  SectionCard,
  StatusBadge,
  fmtInt,
  fmtMoney,
  inputClass,
  type Column,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

const TYPE_TONE: Record<TransactionType, StatusTone> = {
  purchase: "brand",
  consume: "neutral",
  refund: "info",
  bonus: "ok",
};

const TYPE_LABELS: Record<TransactionType, string> = {
  purchase: "Purchase",
  consume: "Consume",
  refund: "Refund",
  bonus: "Bonus",
};

const TRANSACTION_STATUS_TONE: Record<CreditTransaction["status"], StatusTone> = {
  completed: "ok",
  pending: "warn",
  failed: "bad",
  refunded: "info",
};

const typeOptions = [
  { value: "all", label: "All types" },
  ...(Object.keys(TYPE_LABELS) as TransactionType[]).map((type) => ({
    value: type,
    label: TYPE_LABELS[type],
  })),
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...(["completed", "pending", "failed", "refunded"] as CreditTransaction["status"][]).map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
];

const reasonOptions = [
  { value: "goodwill", label: "Goodwill / support" },
  { value: "promotion", label: "Promotion" },
  { value: "compensation", label: "Service compensation" },
  { value: "other", label: "Other" },
];

interface PackageDraft {
  name: string;
  price: string;
  credits: string;
  note: string;
}

interface PackageEditor {
  mode: "create" | "edit";
  id: string | null;
  draft: PackageDraft;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function AiOpsCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>(() =>
    CREDIT_PACKAGES.map((creditPackage) => ({ ...creditPackage })),
  );
  const [editor, setEditor] = useState<PackageEditor | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUser, setGrantUser] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("goodwill");
  const [grantError, setGrantError] = useState<string | null>(null);

  const users = useMemo(
    () => Array.from(new Set(CREDIT_TRANSACTIONS.map((transaction) => transaction.user))).sort(),
    [],
  );

  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CREDIT_TRANSACTIONS.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
      if (!needle) return true;
      return transaction.user.toLowerCase().includes(needle);
    });
  }, [query, typeFilter, statusFilter]);

  const volumeRows = useMemo(() => {
    const totals: Record<TransactionType, number> = { purchase: 0, consume: 0, refund: 0, bonus: 0 };
    CREDIT_TRANSACTIONS.forEach((transaction) => {
      totals[transaction.type] += Math.abs(transaction.credits);
    });
    return (Object.keys(TYPE_LABELS) as TransactionType[]).map((type) => ({
      label: TYPE_LABELS[type],
      value: totals[type],
    }));
  }, []);

  const columns: Column<CreditTransaction>[] = [
    {
      key: "ts",
      header: "Time",
      render: (transaction) => (
        <span className="whitespace-nowrap text-[12.5px] font-medium text-[var(--qs-muted)]">{transaction.ts}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (transaction) => <span className="font-bold text-[var(--qs-ink)]">{transaction.user}</span>,
      sortValue: (transaction) => transaction.user,
    },
    {
      key: "type",
      header: "Type",
      render: (transaction) => <StatusBadge tone={TYPE_TONE[transaction.type]}>{transaction.type}</StatusBadge>,
      sortValue: (transaction) => transaction.type,
    },
    {
      key: "packageName",
      header: "Package",
      render: (transaction) => transaction.packageName ?? "—",
    },
    {
      key: "credits",
      header: "Credits",
      align: "right",
      render: (transaction) => (
        <span
          className={`font-extrabold ${
            transaction.credits >= 0 ? "text-[var(--qs-ok)]" : "text-[var(--qs-bad)]"
          }`}
        >
          {transaction.credits > 0 ? "+" : ""}
          {fmtInt(transaction.credits)}
        </span>
      ),
      sortValue: (transaction) => transaction.credits,
    },
    {
      key: "amountInr",
      header: "Amount",
      align: "right",
      render: (transaction) =>
        transaction.amountInr === null ? (
          "—"
        ) : (
          <span className="font-bold text-[var(--qs-ink)]">{fmtMoney(transaction.amountInr)}</span>
        ),
      sortValue: (transaction) => transaction.amountInr ?? 0,
    },
    {
      key: "status",
      header: "Status",
      render: (transaction) => (
        <StatusBadge tone={TRANSACTION_STATUS_TONE[transaction.status]}>{transaction.status}</StatusBadge>
      ),
      sortValue: (transaction) => transaction.status,
    },
  ];

  const openCreatePackage = () => {
    setPackageError(null);
    setEditor({ mode: "create", id: null, draft: { name: "", price: "", credits: "", note: "" } });
  };

  const openEditPackage = (creditPackage: CreditPackage) => {
    setPackageError(null);
    setEditor({
      mode: "edit",
      id: creditPackage.id,
      draft: {
        name: creditPackage.name,
        price: String(creditPackage.priceInr),
        credits: creditPackage.credits === null ? "" : String(creditPackage.credits),
        note: creditPackage.note,
      },
    });
  };

  const updateDraft = <K extends keyof PackageDraft,>(key: K, value: PackageDraft[K]) => {
    setEditor((previous) => (previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : previous));
  };

  const editorIsMaster =
    editor !== null &&
    (editor.draft.name.trim().toLowerCase() === "master" ||
      (editor.mode === "edit" && packages.find((creditPackage) => creditPackage.id === editor.id)?.credits === null));

  const savePackage = () => {
    if (!editor) return;
    const name = editor.draft.name.trim();
    const price = Number(editor.draft.price);
    const creditsRaw = editor.draft.credits.trim();
    const parsedCredits = Number(creditsRaw);
    const credits: number | null = creditsRaw === "" ? null : parsedCredits;

    if (!name) {
      setPackageError("Package name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setPackageError("Price must be zero or a positive number.");
      return;
    }
    if (
      creditsRaw !== "" &&
      (!Number.isFinite(parsedCredits) || !Number.isInteger(parsedCredits) || parsedCredits <= 0)
    ) {
      setPackageError("Credits must be a positive whole number, or left blank for a configurable package.");
      return;
    }

    if (editor.mode === "edit" && editor.id) {
      setPackages((previous) =>
        previous.map((creditPackage) =>
          creditPackage.id === editor.id
            ? { ...creditPackage, name, priceInr: price, credits, note: editor.draft.note.trim() }
            : creditPackage,
        ),
      );
      toast.success("Package updated (demo)", {
        description: "Backend integration required to persist billing changes.",
      });
    } else {
      const baseId = slugify(name) || "package";
      let id = baseId;
      let suffix = 2;
      while (packages.some((creditPackage) => creditPackage.id === id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      setPackages((previous) => [
        ...previous,
        { id, name, priceInr: price, credits, note: editor.draft.note.trim() },
      ]);
      toast.success("Package added (demo)", {
        description: "Backend integration required to persist billing changes.",
      });
    }
    setEditor(null);
  };

  const applyBonus = () => {
    const amount = Number(grantAmount);
    if (!grantUser) {
      setGrantError("Select a user to receive the bonus credits.");
      return;
    }
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      setGrantError("Bonus credits must be a positive whole number.");
      return;
    }
    setGrantOpen(false);
    setGrantUser("");
    setGrantAmount("");
    setGrantReason("goodwill");
    setGrantError(null);
    toast.success("Bonus credits granted (demo)", {
      description: "Payment and ledger operations require the billing backend.",
    });
  };

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Billing"
        title="Credits & billing"
        description="Credit packages, ledger activity and grant operations for the AI features. Every value here is sample data and checkout is intentionally disabled."
        actions={
          <button type="button" className="b b-pri sm" onClick={() => setGrantOpen(true)}>
            <Gift size={14} />
            Grant bonus credits
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Credits sold"
          value={fmtInt(CREDIT_METRICS.creditsSold)}
          hint="sample purchases"
          icon={Coins}
        />
        <KpiCard
          label="Credits consumed"
          value={fmtInt(CREDIT_METRICS.creditsConsumed)}
          hint="AI feature usage"
          icon={TrendingUp}
        />
        <KpiCard
          label="Outstanding credits"
          value={fmtInt(CREDIT_METRICS.outstandingCredits)}
          hint="available to spend"
          icon={Wallet}
        />
        <KpiCard
          label="Revenue"
          value={fmtMoney(CREDIT_METRICS.revenueInr)}
          hint="sample package sales"
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Contribution margin"
          value="Not available"
          hint={CREDIT_METRICS.marginNote}
          icon={ShieldCheck}
        />
      </div>

      <SectionCard
        title="Credit packages"
        subtitle="Sample pricing for review only — payments and checkout are not enabled in this console."
        actions={
          <button type="button" className="b sm" onClick={openCreatePackage}>
            <Plus size={13} />
            Add package
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {packages.map((creditPackage) => (
            <article
              key={creditPackage.id}
              className="flex flex-col rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                    {creditPackage.name}
                  </p>
                  <p className="qs-display mt-1 text-[24px] font-extrabold leading-none text-[var(--qs-ink)]">
                    {fmtMoney(creditPackage.priceInr)}
                  </p>
                </div>
                <button
                  type="button"
                  className="b b-icon sm b-ghost"
                  aria-label={`Edit ${creditPackage.name} package`}
                  onClick={() => openEditPackage(creditPackage)}
                >
                  <Pencil size={13} />
                </button>
              </div>
              <div className="mt-3 min-h-[26px]">
                {creditPackage.credits === null ? (
                  <StatusBadge tone="warn">Configurable</StatusBadge>
                ) : (
                  <span className="text-[14px] font-extrabold text-[var(--qs-ink)]">
                    {fmtInt(creditPackage.credits)} credits
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-[var(--qs-muted)]">{creditPackage.note}</p>
              <div className="mt-3 border-t-2 border-[var(--qs-line)] pt-3">
                <button type="button" className="b sm" onClick={() => openEditPackage(creditPackage)}>
                  <Pencil size={13} />
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <SectionCard
          title="Credit transactions"
          subtitle="Sample ledger entries across purchases, consumption, refunds and bonus grants."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search by user…"
                label="User search"
                className="w-[180px]"
              />
              <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} className="w-[140px]" />
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                className="w-[150px]"
              />
            </div>
          }
        >
          <DataTable
            columns={columns}
            rows={filteredTransactions}
            rowKey={(transaction) => transaction.id}
            pageSize={10}
            emptyLabel="No transactions match the current filters."
          />
        </SectionCard>

        <SectionCard title="Transaction volume by type (sample)" subtitle="Absolute credits per transaction type">
          <BarList rows={volumeRows} formatValue={(value) => fmtInt(value)} />
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--qs-muted)]">
            Consumption volume dominates the sample ledger. Totals are derived from the rows above and do not
            represent live settlement.
          </p>
        </SectionCard>
      </div>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "create" ? "Add credit package" : "Edit credit package"}
        description="Demo billing configuration only — no payment or checkout action is performed."
        footer={
          <>
            <button type="button" className="b" onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button type="button" className="b b-pri" onClick={savePackage}>
              {editor?.mode === "create" ? "Add package" : "Save package"}
            </button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4">
            <Field label="Package name" htmlFor="credit-package-name" required>
              <input
                id="credit-package-name"
                className={inputClass}
                value={editor.draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="Teacher"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price (₹)" htmlFor="credit-package-price" required>
                <input
                  id="credit-package-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={editor.draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                />
              </Field>
              <Field
                label="Credits"
                htmlFor="credit-package-credits"
                hint={
                  editorIsMaster
                    ? "Master credit quantity is configurable and not finalised"
                    : "Leave blank when the credit quantity is not finalised."
                }
              >
                <input
                  id="credit-package-credits"
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  value={editor.draft.credits}
                  onChange={(event) => updateDraft("credits", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Package note" htmlFor="credit-package-note">
              <input
                id="credit-package-note"
                className={inputClass}
                value={editor.draft.note}
                onChange={(event) => updateDraft("note", event.target.value)}
                placeholder="Most popular for regular classroom use."
              />
            </Field>
            <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--qs-muted)]">
              Package changes are local to this demo session. Backend integration required to persist billing
              changes.
            </p>
            {packageError ? (
              <p
                className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]"
                role="alert"
              >
                {packageError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Grant bonus credits"
        description="This is a demo grant. Payment and ledger operations require the billing backend."
        footer={
          <>
            <button type="button" className="b" onClick={() => setGrantOpen(false)}>
              Cancel
            </button>
            <button type="button" className="b b-pri" onClick={applyBonus}>
              Apply grant
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="User" htmlFor="grant-user" required>
            <FilterSelect
              id="grant-user"
              label="User"
              value={grantUser}
              onChange={setGrantUser}
              options={[
                { value: "", label: "Select user" },
                ...users.map((user) => ({ value: user, label: user })),
              ]}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Credits" htmlFor="grant-amount" required>
              <input
                id="grant-amount"
                type="number"
                min={1}
                step={1}
                className={inputClass}
                value={grantAmount}
                onChange={(event) => setGrantAmount(event.target.value)}
                placeholder="100"
              />
            </Field>
            <Field label="Reason" htmlFor="grant-reason">
              <FilterSelect
                id="grant-reason"
                label="Reason"
                value={grantReason}
                onChange={setGrantReason}
                options={reasonOptions}
              />
            </Field>
          </div>
          {grantError ? (
            <p
              className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]"
              role="alert"
            >
              {grantError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

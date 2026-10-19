"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Coins, Sparkles, Users, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  ACCESS_USERS,
  FEATURES,
  TIER_LABELS,
  USER_SPEND,
  featureLabel,
  type AccessUser,
  type UserAccountStatus,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  DataTable,
  Drawer,
  Field,
  FilterSelect,
  KeyValueList,
  KpiCard,
  Modal,
  NoteBanner,
  SearchInput,
  SectionCard,
  StatusBadge,
  Toggle,
  fmtInt,
  fmtMoney,
  inputClass,
  type Column,
  type SelectOption,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

type StatusFilter = "all" | UserAccountStatus;
type CreditReason = "support" | "bonus" | "correction";

const STATUS_TONE: Record<UserAccountStatus, StatusTone> = {
  active: "ok",
  trial: "info",
  suspended: "bad",
  exhausted: "warn",
};

const PLAN_OPTIONS: SelectOption[] = [
  { value: "all", label: "All plans" },
  { value: "Starter", label: "Starter" },
  { value: "Teacher", label: "Teacher" },
  { value: "Master", label: "Master" },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
  { value: "exhausted", label: "Exhausted" },
];

const STATUS_EDIT_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
];

const CREDIT_REASON_OPTIONS: SelectOption[] = [
  { value: "support", label: "Support" },
  { value: "bonus", label: "Bonus" },
  { value: "correction", label: "Correction" },
];

const cloneUsers = (): AccessUser[] => ACCESS_USERS.map((user) => ({ ...user, features: [...user.features] }));

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function AiOpsAccessPage() {
  const [users, setUsers] = useState<AccessUser[]>(cloneUsers);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState<CreditReason>("support");
  const [creditError, setCreditError] = useState<string | null>(null);

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const usage = selected ? USER_SPEND.find((row) => selected.email.startsWith(row.user)) : undefined;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (plan !== "all" && user.plan !== plan) return false;
      if (status !== "all" && user.status !== status) return false;
      if (!needle) return true;
      return `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(needle);
    });
  }, [users, query, plan, status]);

  const activeCount = users.filter((user) => user.status === "active").length;
  const trialCount = users.filter((user) => user.status === "trial").length;
  const restrictedCount = users.filter((user) => user.status === "suspended" || user.status === "exhausted").length;
  const lowCreditCount = users.filter((user) => user.creditBalance < 100).length;

  const columns: Column<AccessUser>[] = [
    {
      key: "user",
      header: "User",
      sortValue: (user) => user.name,
      render: (user) => (
        <div className="min-w-[180px]">
          <p className="font-bold text-[var(--qs-ink)]">{user.name}</p>
          <p className="text-[11.5px] text-[var(--qs-muted)]">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (user) => user.role,
      render: (user) => <span className="text-[var(--qs-ink)]">{capitalize(user.role)}</span>,
    },
    {
      key: "plan",
      header: "Plan",
      sortValue: (user) => user.plan,
      render: (user) => <StatusBadge tone="neutral">{user.plan}</StatusBadge>,
    },
    {
      key: "tier",
      header: "Tier",
      sortValue: (user) => user.tier,
      render: (user) => <StatusBadge tone="brand">{TIER_LABELS[user.tier]}</StatusBadge>,
    },
    {
      key: "features",
      header: "Features",
      align: "center",
      sortValue: (user) => user.features.length,
      render: (user) => (
        <span className="whitespace-nowrap font-bold text-[var(--qs-ink)]">
          {user.features.length} of {FEATURES.length}
        </span>
      ),
    },
    {
      key: "limits",
      header: "Daily / monthly",
      align: "right",
      sortValue: (user) => user.dailyLimit,
      render: (user) => (
        <div className="whitespace-nowrap">
          <p className="font-bold text-[var(--qs-ink)]">{fmtInt(user.dailyLimit)} / day</p>
          <p className="text-[11.5px] text-[var(--qs-muted)]">{fmtInt(user.monthlyLimit)} / month</p>
        </div>
      ),
    },
    {
      key: "reasoning",
      header: "Reasoning",
      align: "center",
      sortValue: (user) => (user.reasoningAccess ? 1 : 0),
      render: (user) => (
        <StatusBadge tone={user.reasoningAccess ? "ok" : "neutral"}>
          {user.reasoningAccess ? "yes" : "no"}
        </StatusBadge>
      ),
    },
    {
      key: "credit",
      header: "Credits",
      align: "right",
      sortValue: (user) => user.creditBalance,
      render: (user) => (
        <span
          className={`font-extrabold ${
            user.creditBalance < 100 ? "text-[var(--qs-bad)]" : "text-[var(--qs-ink)]"
          }`}
        >
          {fmtInt(user.creditBalance)}
        </span>
      ),
    },
    {
      key: "periodCost",
      header: "Period cost",
      align: "right",
      sortValue: (user) => user.periodCostInr,
      render: (user) => <span className="font-bold text-[var(--qs-ink)]">{fmtMoney(user.periodCostInr)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (user) => user.status,
      render: (user) => (
        <StatusBadge tone={STATUS_TONE[user.status]} dot>
          {user.status}
        </StatusBadge>
      ),
    },
  ];

  const updateReasoning = (next: boolean) => {
    if (!selected) return;
    setUsers((prev) =>
      prev.map((user) => (user.id === selected.id ? { ...user, reasoningAccess: next } : user)),
    );
    toast.info("Demo-only change", {
      description: "Backend integration required to persist access changes.",
    });
  };

  const updateStatus = (next: UserAccountStatus) => {
    if (!selected) return;
    setUsers((prev) => prev.map((user) => (user.id === selected.id ? { ...user, status: next } : user)));
    toast.info("Demo-only change", {
      description: "Backend integration required to persist access changes.",
    });
  };

  const openCreditModal = () => {
    setCreditAmount("");
    setCreditReason("support");
    setCreditError(null);
    setCreditOpen(true);
  };

  const applyCredits = () => {
    if (!selected) return;
    const amount = Number(creditAmount);
    if (!Number.isInteger(amount) || amount === 0) {
      setCreditError("Enter a non-zero whole number of credits.");
      return;
    }
    const newBalance = selected.creditBalance + amount;
    setUsers((prev) =>
      prev.map((user) => (user.id === selected.id ? { ...user, creditBalance: newBalance } : user)),
    );
    setCreditOpen(false);
    setCreditError(null);
    toast.success("Credit balance adjusted (demo)", {
      description: `New balance: ${fmtInt(newBalance)} credits. This change is not persisted.`,
    });
  };

  const editStatusOptions =
    selected?.status === "exhausted"
      ? [{ value: "exhausted", label: "Exhausted" }, ...STATUS_EDIT_OPTIONS]
      : STATUS_EDIT_OPTIONS;

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Access"
        title="User access"
        description="Control who can use each AI feature, review limits and credits, and inspect per-user spend. All changes on this page are demo-only."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total users" value={fmtInt(users.length)} hint="in this demo workspace" icon={Users} />
        <KpiCard label="Active" value={fmtInt(activeCount)} hint="full access" icon={CheckCircle2} />
        <KpiCard label="Trial" value={fmtInt(trialCount)} hint="time-limited access" icon={Sparkles} />
        <KpiCard
          label="Restricted"
          value={fmtInt(restrictedCount)}
          hint="suspended or exhausted"
          icon={Ban}
        />
        <KpiCard
          label="Low credits"
          value={fmtInt(lowCreditCount)}
          hint="below 100 credits"
          icon={Wallet}
        />
      </div>

      <NoteBanner tone="info">
        Access changes here are demo-only — production writes must go through the user-admin API.
      </NoteBanner>

      <SectionCard
        title="User accounts"
        subtitle="Feature access, limits and credit balance for every AI user"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search name or email…"
              className="w-[210px]"
            />
            <FilterSelect label="Plan" value={plan} onChange={setPlan} options={PLAN_OPTIONS} className="w-[140px]" />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as StatusFilter)}
              options={STATUS_FILTER_OPTIONS}
              className="w-[150px]"
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(user) => user.id}
          pageSize={8}
          initialSortKey="user"
          initialSortDir="asc"
          onRowClick={(user) => setSelectedId(user.id)}
          emptyLabel="No users match the current filters."
        />
      </SectionCard>

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? "User"}
        subtitle={selected ? `${capitalize(selected.role)} · ${selected.email}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-[var(--qs-muted)]">
                {fmtInt(selected.creditBalance)} credits
              </span>
              <button type="button" className="b b-pri sm" onClick={openCreditModal}>
                <Coins size={13} />
                Adjust credits
              </button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            {usage ? (
              <div className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--qs-ink)]">
                This month: {fmtInt(usage.requests)} requests · {fmtMoney(usage.costInr)} spend
              </div>
            ) : null}

            <KeyValueList
              columns={2}
              items={[
                { label: "User ID", value: <span className="font-mono text-[12px]">{selected.id}</span> },
                { label: "Email", value: selected.email },
                { label: "Role", value: capitalize(selected.role) },
                { label: "Plan", value: selected.plan },
                { label: "Tier", value: TIER_LABELS[selected.tier] },
                { label: "Daily limit", value: `${fmtInt(selected.dailyLimit)} requests` },
                { label: "Monthly limit", value: `${fmtInt(selected.monthlyLimit)} requests` },
                { label: "Credit balance", value: `${fmtInt(selected.creditBalance)} credits` },
                { label: "Period cost", value: fmtMoney(selected.periodCostInr) },
                {
                  label: "Status",
                  value: (
                    <StatusBadge tone={STATUS_TONE[selected.status]} dot>
                      {selected.status}
                    </StatusBadge>
                  ),
                },
              ]}
            />

            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                Feature access
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FEATURES.map((feature) => {
                  const enabled = selected.features.includes(feature.id);
                  return (
                    <span
                      key={feature.id}
                      className={`b b-chip sm ${
                        enabled ? "" : "border-[var(--qs-line)] text-[var(--qs-muted)] opacity-60"
                      }`}
                      data-selected={enabled}
                    >
                      {featureLabel(feature.id)}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
              <div>
                <p className="text-[13.5px] font-extrabold text-[var(--qs-ink)]">Reasoning access</p>
                <p className="text-[12px] text-[var(--qs-muted)]">Allow advanced reasoning models for this account.</p>
              </div>
              <Toggle
                checked={selected.reasoningAccess}
                onChange={updateReasoning}
                label={`Reasoning access for ${selected.name}`}
              />
            </div>

            <Field
              label="Account status"
              htmlFor="access-status"
              hint="Status changes apply to this demo session only."
            >
              <FilterSelect
                id="access-status"
                label="Account status"
                value={selected.status}
                onChange={(value) => updateStatus(value as UserAccountStatus)}
                options={editStatusOptions}
              />
            </Field>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        title="Adjust credits"
        description={selected ? `Add or deduct credits for ${selected.name}. Demo-only change.` : undefined}
        footer={
          <>
            <button type="button" className="b" onClick={() => setCreditOpen(false)}>
              Cancel
            </button>
            <button type="button" className="b b-pri" onClick={applyCredits}>
              Apply
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field
            label="Amount"
            htmlFor="credit-amount"
            hint="Positive to add, negative to deduct. Whole numbers only."
          >
            <input
              id="credit-amount"
              type="number"
              step={1}
              className={inputClass}
              value={creditAmount}
              onChange={(event) => {
                setCreditAmount(event.target.value);
                setCreditError(null);
              }}
              placeholder="e.g. 100 or -50"
            />
          </Field>
          <Field label="Reason" htmlFor="credit-reason">
            <FilterSelect
              id="credit-reason"
              label="Reason"
              value={creditReason}
              onChange={(value) => setCreditReason(value as CreditReason)}
              options={CREDIT_REASON_OPTIONS}
            />
          </Field>
          {creditError ? (
            <p
              role="alert"
              className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]"
            >
              {creditError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

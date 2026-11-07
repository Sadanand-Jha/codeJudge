"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { SectionCard, SectionSkeleton, ErrorState } from "@/components/platform/ui";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type CountryPricingConfig,
  type CountryPricingRevenue,
} from "@/services/platform";

type PriceDraft = {
  currency: string;
  amountMajor: string;
  isActive: boolean;
};

function countryName(code: string | null): string {
  if (!code) return "Fallback";
  return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
}

function formatRevenue(amountMinor: number, currency: string): string {
  try {
    const exponent = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: exponent,
    }).format(amountMinor / 10 ** exponent);
  } catch {
    return `${currency} ${amountMinor}`;
  }
}

export function CountryPricingAdmin() {
  const toast = useToast();
  const [prices, setPrices] = useState<CountryPricingConfig[]>([]);
  const [revenue, setRevenue] = useState<CountryPricingRevenue[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState({ countryCode: "", currency: "USD", amountMajor: "4.99" });

  const load = useCallback(async () => {
    try {
      const data = await platformApi.countryPricing();
      setPrices(data.prices);
      setRevenue(data.revenue);
      setDrafts(Object.fromEntries(data.prices.map((price) => [
        price.isFallback ? "fallback" : price.countryCode ?? "",
        {
          currency: price.currency,
          amountMajor: String(price.amountMajor),
          isActive: price.isActive,
        },
      ])));
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Could not load country pricing."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial admin data load
    void load();
  }, [load]);

  const save = async (countryCode: string | "fallback", draft: PriceDraft) => {
    const amountMajor = Number(draft.amountMajor);
    if (!Number.isFinite(amountMajor) || amountMajor < 0) {
      toast.error({ title: "Enter a valid monthly price" });
      return;
    }
    setSaving(countryCode);
    try {
      await platformApi.updateCountryPricing(countryCode, {
        currency: draft.currency.trim().toUpperCase(),
        amountMajor,
        isActive: draft.isActive,
      });
      toast.success({ title: "Country pricing saved", description: `${countryName(countryCode === "fallback" ? null : countryCode)} now uses versioned pricing.` });
      await load();
    } catch (saveError) {
      toast.error({ title: "Country pricing could not be saved", description: getApiErrorMessage(saveError, "Try again.") });
    } finally {
      setSaving(null);
    }
  };

  const addCountry = async () => {
    const code = newCountry.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || prices.some((price) => price.countryCode === code)) {
      toast.error({ title: "Enter a new two-letter ISO country code" });
      return;
    }
    await save(code, {
      currency: newCountry.currency,
      amountMajor: newCountry.amountMajor,
      isActive: true,
    });
    setNewCountry({ countryCode: "", currency: "USD", amountMajor: "4.99" });
  };

  if (loading) return <SectionSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const fallback = prices.find((price) => price.isFallback);
  const countryPrices = prices.filter((price) => !price.isFallback);

  const updateDraft = (key: string, patch: Partial<PriceDraft>) => {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Country-wise Elevate prices"
        subtitle="Prices are monthly, versioned, and used by the server at checkout. Currency availability is separately gated by the Razorpay account configuration."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--qs-line)] text-[11px] uppercase text-[var(--qs-muted)]">
                <th className="px-2 py-2">Country</th>
                <th className="px-2 py-2">Currency</th>
                <th className="px-2 py-2">Monthly price</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {countryPrices.map((price) => {
                const code = price.countryCode ?? "";
                const draft = drafts[code] ?? {
                  currency: price.currency,
                  amountMajor: String(price.amountMajor),
                  isActive: price.isActive,
                };
                return (
                  <tr key={price.id} className="border-b border-[var(--qs-line)]">
                    <td className="px-2 py-3 font-bold">{countryName(code)} ({code})</td>
                    <td className="px-2 py-3">
                      <input
                        aria-label={`${code} currency`}
                        className="w-24 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5 font-bold uppercase"
                        maxLength={3}
                        value={draft.currency}
                        onChange={(event) => updateDraft(code, { currency: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        aria-label={`${code} monthly price`}
                        className="w-28 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5 font-bold"
                        type="number"
                        min="0"
                        step="0.001"
                        value={draft.amountMajor}
                        onChange={(event) => updateDraft(code, { amountMajor: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <label className="inline-flex items-center gap-2 text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) => updateDraft(code, { isActive: event.target.checked })}
                        />
                        {draft.isActive ? "Active" : "Disabled"}
                      </label>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">v{price.version}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-ink)] px-3 py-1.5 text-xs font-extrabold"
                        disabled={saving === code}
                        onClick={() => void save(code, draft)}
                      >
                        <Save size={13} />
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Fallback pricing"
        subtitle="Applied when no eligible billing country, trusted IP country, or international mobile calling code is available."
      >
        {fallback && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-bold">
              Currency
              <input
                className="w-24 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5 uppercase"
                maxLength={3}
                value={drafts.fallback?.currency ?? fallback.currency}
                onChange={(event) => updateDraft("fallback", { currency: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold">
              Monthly price
              <input
                className="w-28 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5"
                type="number"
                min="0"
                step="0.001"
                value={drafts.fallback?.amountMajor ?? String(fallback.amountMajor)}
                onChange={(event) => updateDraft("fallback", { amountMajor: event.target.value })}
              />
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={drafts.fallback?.isActive ?? fallback.isActive}
                onChange={(event) => updateDraft("fallback", { isActive: event.target.checked })}
              />
              Active
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-ink)] px-3 py-1.5 text-xs font-extrabold"
              disabled={saving === "fallback"}
              onClick={() => void save("fallback", drafts.fallback ?? {
                currency: fallback.currency,
                amountMajor: String(fallback.amountMajor),
                isActive: fallback.isActive,
              })}
            >
              <Save size={13} />
              Save fallback
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Add a country" subtitle="Use an ISO 3166-1 alpha-2 country code and its predefined monthly currency price.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-bold">
            Country code
            <input
              className="w-28 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5 uppercase"
              maxLength={2}
              placeholder="JP"
              value={newCountry.countryCode}
              onChange={(event) => setNewCountry((value) => ({ ...value, countryCode: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold">
            Currency
            <input
              className="w-24 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5 uppercase"
              maxLength={3}
              value={newCountry.currency}
              onChange={(event) => setNewCountry((value) => ({ ...value, currency: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold">
            Monthly price
            <input
              className="w-28 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5"
              type="number"
              min="0"
              step="0.001"
              value={newCountry.amountMajor}
              onChange={(event) => setNewCountry((value) => ({ ...value, amountMajor: event.target.value }))}
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-ink)] px-3 py-1.5 text-xs font-extrabold"
            disabled={saving === newCountry.countryCode.toUpperCase()}
            onClick={() => void addCountry()}
          >
            <Plus size={13} />
            Add country
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Subscriptions and revenue by country"
        subtitle="Revenue totals are grouped by the currency charged and use each order's stored payment snapshot."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--qs-line)] text-[11px] uppercase text-[var(--qs-muted)]">
                <th className="px-2 py-2">Country</th>
                <th className="px-2 py-2">Currency</th>
                <th className="px-2 py-2">Paid orders</th>
                <th className="px-2 py-2">Active subscriptions</th>
                <th className="px-2 py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((row) => (
                <tr key={`${row.countryCode ?? "ZZ"}:${row.currency}`} className="border-b border-[var(--qs-line)]">
                  <td className="px-2 py-3 font-bold">
                    {countryName(row.countryCode)}{row.countryCode ? ` (${row.countryCode})` : ""}
                  </td>
                  <td className="px-2 py-3 font-mono">{row.currency}</td>
                  <td className="px-2 py-3">{row.orders}</td>
                  <td className="px-2 py-3">{row.subscriptions}</td>
                  <td className="px-2 py-3 font-extrabold">{formatRevenue(row.revenueMinor, row.currency)}</td>
                </tr>
              ))}
              {revenue.length === 0 && (
                <tr><td className="px-2 py-4 text-[var(--qs-muted)]" colSpan={5}>No paid orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

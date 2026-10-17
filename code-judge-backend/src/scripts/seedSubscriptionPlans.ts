// Seed the subscription catalog with sensible starter plans.
//
//   npm run seed:plans
//
// Idempotent: existing plans/prices/entitlements are never overwritten, so it
// is safe to run in any environment. The Free plan itself is also seeded by
// migration 34 — this script covers the paid sample plans (Pro, Institute)
// used by the /platform console and the pricing page.
import "dotenv/config";
import { pool } from "../config/database.ts";

interface SeedEntitlement {
  key: string;
  value: number | boolean;
}

interface SeedPrice {
  billing_period: "monthly" | "quarterly" | "yearly" | "lifetime" | "custom_days";
  amount: number; // paise
  tax_inclusive?: boolean;
}

interface SeedPlan {
  name: string;
  slug: string;
  description: string;
  status: "active";
  is_public: boolean;
  is_default_free: boolean;
  sort_order: number;
  trial_days: number;
  prices: SeedPrice[];
  entitlements: SeedEntitlement[];
}

const PLANS: SeedPlan[] = [
  {
    name: "Free",
    slug: "free",
    description: "Everything you need to get started with quizzes.",
    status: "active",
    is_public: true,
    is_default_free: true,
    sort_order: 0,
    trial_days: 0,
    prices: [],
    entitlements: [
      { key: "max_quizzes", value: 10 },
      { key: "max_questions_per_quiz", value: 30 },
      { key: "max_participants_per_quiz", value: -1 },
      { key: "max_monthly_attempts", value: -1 },
      { key: "pdf_download", value: true },
      { key: "answer_key_pdf", value: true },
      { key: "custom_pdf_header", value: true },
      { key: "remove_branding", value: false },
      { key: "ai_features", value: true },
      { key: "storage_mb", value: -1 },
      { key: "team_members", value: 0 },
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For active teachers and creators running regular assessments.",
    status: "active",
    is_public: true,
    is_default_free: false,
    sort_order: 10,
    trial_days: 7,
    prices: [
      { billing_period: "monthly", amount: 49900 },
      { billing_period: "yearly", amount: 499900 },
    ],
    entitlements: [
      { key: "max_quizzes", value: 100 },
      { key: "max_questions_per_quiz", value: 100 },
      { key: "max_participants_per_quiz", value: 500 },
      { key: "max_monthly_attempts", value: 10000 },
      { key: "pdf_download", value: true },
      { key: "answer_key_pdf", value: true },
      { key: "custom_pdf_header", value: true },
      { key: "remove_branding", value: true },
      { key: "ai_features", value: true },
      { key: "storage_mb", value: 10240 },
      { key: "team_members", value: 5 },
    ],
  },
  {
    name: "Institute",
    slug: "institute",
    description: "Unlimited assessments, branding and team collaboration for institutes.",
    status: "active",
    is_public: true,
    is_default_free: false,
    sort_order: 20,
    trial_days: 14,
    prices: [
      { billing_period: "monthly", amount: 199900 },
      { billing_period: "yearly", amount: 1999000 },
    ],
    entitlements: [
      { key: "max_quizzes", value: -1 },
      { key: "max_questions_per_quiz", value: -1 },
      { key: "max_participants_per_quiz", value: -1 },
      { key: "max_monthly_attempts", value: -1 },
      { key: "pdf_download", value: true },
      { key: "answer_key_pdf", value: true },
      { key: "custom_pdf_header", value: true },
      { key: "remove_branding", value: true },
      { key: "ai_features", value: true },
      { key: "storage_mb", value: -1 },
      { key: "team_members", value: 25 },
    ],
  },
];

async function seedPlan(plan: SeedPlan): Promise<void> {
  const inserted = await pool.query(
    `INSERT INTO plans (name, slug, description, status, is_public, is_default_free, sort_order, trial_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    [
      plan.name,
      plan.slug,
      plan.description,
      plan.status,
      plan.is_public,
      plan.is_default_free,
      plan.sort_order,
      plan.trial_days,
    ]
  );

  let planId = inserted.rows[0]?.id as number | undefined;
  if (!planId) {
    const existing = await pool.query("SELECT id FROM plans WHERE slug = $1", [plan.slug]);
    planId = existing.rows[0]?.id as number | undefined;
  }
  if (!planId) {
    console.error(`Could not resolve plan id for ${plan.slug}`);
    return;
  }

  let priceCount = 0;
  for (const price of plan.prices) {
    const result = await pool.query(
      `INSERT INTO plan_prices (plan_id, billing_period, amount, currency, tax_inclusive)
       VALUES ($1, $2, $3, 'INR', $4)
       ON CONFLICT (plan_id, billing_period, COALESCE(custom_days, 0)) WHERE is_active = true DO NOTHING
       RETURNING id`,
      [planId, price.billing_period, price.amount, price.tax_inclusive ?? true]
    );
    if (result.rows[0]) priceCount += 1;
  }

  let entitlementCount = 0;
  for (const entitlement of plan.entitlements) {
    const result = await pool.query(
      `INSERT INTO plan_entitlements (plan_id, key, value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (plan_id, key) DO NOTHING
       RETURNING key`,
      [planId, entitlement.key, JSON.stringify(entitlement.value)]
    );
    if (result.rows[0]) entitlementCount += 1;
  }

  console.log(
    `  ${inserted.rows[0] ? "created" : "exists"}  ${plan.name.padEnd(10)} ` +
      `(+${priceCount} prices, +${entitlementCount} entitlements)`
  );
}

async function main(): Promise<void> {
  console.log("Seeding subscription plans...");
  for (const plan of PLANS) {
    await seedPlan(plan);
  }
  console.log("Done.");
  await pool.end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});

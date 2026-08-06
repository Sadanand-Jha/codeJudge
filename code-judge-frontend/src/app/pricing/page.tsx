'use client'
import {
  Bot, MessageSquare, Bug, Brain, Sparkles, Gamepad2, Rocket,
  Wand2, FileText, Mail, FileSpreadsheet, Download, Database, CalendarClock,
  Lock, GraduationCap, BarChart3, Zap, Infinity as InfinityIcon, Crown,
  Check, ChevronDown, X, TrendingUp, Layers,
  Shield, Palette, Smile, Type, Users, Plus, Minus,
  NotebookPen, CreditCard, Landmark, Wallet, Smartphone, ShoppingCart, ArrowDown
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import ScrollStory from "@/components/pricing/story/ScrollStory";
import { PLAN_CREDIT_ALLOWANCES, CREDIT_PACKS, AI_CREDIT_COSTS } from "@/config/aiCredits";
import { useAICreditsStore } from "@/store/aiCreditsStore";

/* ============================================
   Types
   ============================================ */
type FeatureType = "checkbox" | "radio" | "quantity";
type Audience = "student" | "creator";
type CategoryId =
  | "student-ai" | "student-waiting" | "student-analytics"
  | "creator-quiz" | "creator-ai" | "creator-reports" | "creator-management";

interface RadioOption {
  id: string;
  label: string;
  price: number;
  note?: string;
}

interface FeatureConfig {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  type: FeatureType;
  icon: React.ElementType;
  monthlyPrice?: number;
  options?: RadioOption[];
  defaultOption?: string;
  includes?: string[];
  recommends?: string[];
  bundleEligible?: boolean;
  maxLimit?: number;
}

interface CategoryConfig {
  label: string;
  icon: React.ElementType;
  desc: string;
  audience: Audience;
}

/* ============================================
   Single Source of Truth — Subscription Configuration
   Every feature is generated dynamically from this object.
   ============================================ */
const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  "student-ai":        { label: "AI Features",            icon: Bot,          desc: "Supercharge your practice with AI assistance.", audience: "student" },
  "student-waiting":   { label: "Premium Waiting Room",   icon: Gamepad2,     desc: "Cosmetics that make every quiz feel special.", audience: "student" },
  "student-analytics": { label: "Analytics & Performance",icon: BarChart3,    desc: "Track and accelerate your progress.", audience: "student" },
  "creator-quiz":      { label: "Quiz Creation Limits",   icon: GraduationCap,desc: "Scale your assessments, not your workload.", audience: "creator" },
  "creator-ai":        { label: "AI Quiz Creation",       icon: Wand2,        desc: "Generate and improve questions in seconds.", audience: "creator" },
  "creator-reports":   { label: "Reports & Results",      icon: FileText,     desc: "Automate grading, reporting, and delivery.", audience: "creator" },
  "creator-management":{ label: "Classroom Management",   icon: Users,        desc: "Tools that save educators hours.", audience: "creator" },
};

const SUBSCRIPTION_FEATURES: FeatureConfig[] = [
  /* ===== Student — AI Features ===== */
  {
    id: "ai-companion",
    category: "student-ai",
    title: "AI Coding Companion",
    description: "Context-aware coding help while you solve.",
    type: "checkbox",
    icon: Bot,
    monthlyPrice: 149,
    includes: [
      "Context-aware coding help",
      "Doesn't reveal complete solutions",
      "Understands the current problem",
    ],
    recommends: ["ai-debugger"],
    bundleEligible: true,
  },
  {
    id: "ai-hints",
    category: "student-ai",
    title: "AI Hints",
    description: "Progressive hints that guide without spoiling.",
    type: "radio",
    icon: MessageSquare,
    options: [
      { id: "h100", label: "100 hints/month", price: 79 },
      { id: "h500", label: "500 hints/month", price: 129 },
      { id: "hunlimited", label: "Unlimited", price: 199 },
    ],
    defaultOption: "h100",
    recommends: ["ai-companion", "ai-debugger"],
    bundleEligible: true,
  },
  {
    id: "ai-debugger",
    category: "student-ai",
    title: "AI Debugger",
    description: "Understand and fix errors faster.",
    type: "checkbox",
    icon: Bug,
    monthlyPrice: 99,
    includes: [
      "Explains runtime errors",
      "Suggests fixes",
      "Performance suggestions",
    ],
    recommends: ["ai-companion"],
    bundleEligible: true,
  },
  {
    id: "ai-complexity",
    category: "student-ai",
    title: "AI Complexity Analyzer",
    description: "Know the cost of your code instantly.",
    type: "checkbox",
    icon: Brain,
    monthlyPrice: 49,
    includes: ["Time Complexity", "Space Complexity", "Optimization suggestions"],
    bundleEligible: true,
  },

  /* ===== Student — Premium Waiting Room ===== */
  {
    id: "premium-avatars",
    category: "student-waiting",
    title: "Premium Avatar Collection",
    description: "Stand out before the quiz even starts.",
    type: "checkbox",
    icon: Palette,
    monthlyPrice: 49,
    includes: ["Animated avatars", "Rare avatar packs", "Seasonal avatars", "Exclusive profile themes"],
    recommends: ["avatar-decorations"],
    bundleEligible: true,
  },
  {
    id: "avatar-decorations",
    category: "student-waiting",
    title: "Avatar Decorations",
    description: "Discord-style decorations around your avatar.",
    type: "checkbox",
    icon: Sparkles,
    monthlyPrice: 39,
    includes: ["Animated borders", "Neon glow", "Sparkles", "Floating particles", "Discord-style decorations"],
    recommends: ["premium-avatars", "waiting-cosmetics"],
    bundleEligible: true,
  },
  {
    id: "waiting-cosmetics",
    category: "student-waiting",
    title: "Waiting Room Cosmetics",
    description: "A premium entrance, every single time.",
    type: "checkbox",
    icon: Rocket,
    monthlyPrice: 69,
    includes: ["Moving aura", "Special join animation", "Particle trails", "Profile effects", "Exclusive badges"],
    bundleEligible: true,
  },
  {
    id: "username-customization",
    category: "student-waiting",
    title: "Username Customization",
    description: "Make your name unforgettable.",
    type: "checkbox",
    icon: Type,
    monthlyPrice: 29,
    includes: ["Gradient usernames", "Animated colors", "Custom fonts", "Icons beside name"],
    bundleEligible: true,
  },
  {
    id: "emoji-reactions",
    category: "student-waiting",
    title: "Premium Emojis & Reactions",
    description: "Express yourself in the waiting room.",
    type: "checkbox",
    icon: Smile,
    monthlyPrice: 19,
    includes: ["Animated emoji reactions", "Exclusive stickers", "Premium emotes"],
    bundleEligible: true,
  },

  /* ===== Student — Analytics ===== */
  {
    id: "advanced-analytics",
    category: "student-analytics",
    title: "Advanced Progress Analytics",
    description: "Deep insight into every attempt.",
    type: "checkbox",
    icon: TrendingUp,
    monthlyPrice: 59,
    includes: ["Topic-wise breakdown", "Streak analytics", "Performance heatmap", "Submission insights"],
    bundleEligible: true,
  },
  {
    id: "faster-queue",
    category: "student-analytics",
    title: "Faster Judge Queue",
    description: "Skip the line on the code judge.",
    type: "checkbox",
    icon: Zap,
    monthlyPrice: 99,
    includes: ["Priority compilation", "Reduced wait times"],
    bundleEligible: true,
  },
  {
    id: "unlimited-quizzes",
    category: "student-analytics",
    title: "Unlimited Quiz Attempts",
    description: "Practice without limits.",
    type: "checkbox",
    icon: InfinityIcon,
    monthlyPrice: 49,
    includes: ["No daily cap", "Retake any quiz"],
    bundleEligible: true,
  },

  /* ===== Creator — Quiz Creation Limits ===== */
  {
    id: "quiz-limit",
    category: "creator-quiz",
    title: "Quiz Creation Limit",
    description: "Choose how many quizzes you can create each day.",
    type: "radio",
    icon: GraduationCap,
    options: [
      { id: "q5", label: "5 quizzes/day", price: 99 },
      { id: "q10", label: "10 quizzes/day", price: 179 },
      { id: "q20", label: "20 quizzes/day", price: 299 },
      { id: "qunlimited", label: "Unlimited", price: 499 },
    ],
    bundleEligible: true,
  },
  {
    id: "max-students",
    category: "creator-quiz",
    title: "Maximum Students Per Quiz",
    description: "Scale to bigger classrooms and clubs.",
    type: "radio",
    icon: Users,
    options: [
      { id: "s100", label: "100 students", price: 0, note: "Included" },
      { id: "s250", label: "250 students", price: 49 },
      { id: "s500", label: "500 students", price: 99 },
      { id: "s1000", label: "1000 students", price: 199 },
      { id: "sunlimited", label: "Unlimited", price: 399 },
    ],
    bundleEligible: true,
  },

  /* ===== Creator — AI Quiz Creation ===== */
  {
    id: "ai-quiz-creation",
    category: "creator-ai",
    title: "AI Quiz Creation",
    description: "Generate a full quiz from a topic in seconds.",
    type: "checkbox",
    icon: Wand2,
    monthlyPrice: 149,
    includes: [
      "Generate questions",
      "Generate MCQs",
      "Generate coding questions",
      "Topic suggestions",
      "Difficulty balancing",
    ],
    recommends: ["ai-test-cases", "ai-question-improver"],
    bundleEligible: true,
  },
  {
    id: "ai-test-cases",
    category: "creator-ai",
    title: "AI Test Case Generator",
    description: "Automatically creates hidden & public test cases.",
    type: "checkbox",
    icon: Database,
    monthlyPrice: 99,
    includes: ["Hidden test cases", "Public test cases", "Edge-case coverage"],
    recommends: ["ai-question-improver", "ai-quiz-creation"],
    bundleEligible: true,
  },
  {
    id: "ai-question-improver",
    category: "creator-ai",
    title: "AI Question Improver",
    description: "Polish every question before publishing.",
    type: "checkbox",
    icon: Shield,
    monthlyPrice: 79,
    includes: ["Grammar", "Difficulty", "Quality", "Plagiarism suggestions"],
    recommends: ["ai-test-cases"],
    bundleEligible: true,
  },

  /* ===== Creator — Reports ===== */
  {
    id: "email-reports",
    category: "creator-reports",
    title: "Email Reports",
    description: "Automatic results delivered to every student.",
    type: "checkbox",
    icon: Mail,
    monthlyPrice: 49,
    includes: ["Automatic result emails", "Leaderboard emails", "Performance reports"],
    recommends: ["pdf-reports", "excel-reports"],
    bundleEligible: true,
  },
  {
    id: "pdf-reports",
    category: "creator-reports",
    title: "PDF Reports",
    description: "Polished, printable result sheets.",
    type: "checkbox",
    icon: FileSpreadsheet,
    monthlyPrice: 39,
    includes: ["Per-student PDFs", "Batch summary PDF"],
    recommends: ["excel-reports"],
    bundleEligible: true,
  },
  {
    id: "excel-reports",
    category: "creator-reports",
    title: "Excel Reports",
    description: "Raw data for your own analysis.",
    type: "checkbox",
    icon: Download,
    monthlyPrice: 39,
    includes: ["Full submission export", "Score sheets"],
    bundleEligible: true,
  },

  /* ===== Creator — Management ===== */
  {
    id: "bulk-import",
    category: "creator-management",
    title: "Bulk Student Import",
    description: "Add an entire class in one upload.",
    type: "checkbox",
    icon: NotebookPen,
    monthlyPrice: 49,
    includes: ["CSV", "Excel", "Roll number mapping"],
    bundleEligible: true,
  },
  {
    id: "question-bank",
    category: "creator-management",
    title: "Question Bank",
    description: "Build a reusable library of questions.",
    type: "checkbox",
    icon: Layers,
    monthlyPrice: 79,
    includes: ["Reusable problems", "Folders", "Tags", "Version history"],
    bundleEligible: true,
  },
  {
    id: "collaborators",
    category: "creator-management",
    title: "Collaborators",
    description: "Invite co-teachers and TAs.",
    type: "radio",
    icon: Users,
    options: [
      { id: "c2", label: "2 collaborators", price: 0, note: "Included" },
      { id: "c5", label: "5 collaborators", price: 49 },
      { id: "c10", label: "10 collaborators", price: 99 },
      { id: "cunlimited", label: "Unlimited", price: 199 },
    ],
    bundleEligible: true,
  },
  {
    id: "scheduled-quizzes",
    category: "creator-management",
    title: "Scheduled Quizzes",
    description: "Set it and forget it.",
    type: "checkbox",
    icon: CalendarClock,
    monthlyPrice: 29,
    includes: ["Auto-publish", "Auto-close"],
    bundleEligible: true,
  },
  {
    id: "private-quizzes",
    category: "creator-management",
    title: "Private Quizzes",
    description: "Only invitees can access.",
    type: "checkbox",
    icon: Lock,
    monthlyPrice: 39,
    includes: ["Invite-only access", "Password protection"],
    bundleEligible: true,
  },
];

const ULTIMATE_PRICE = 899;
const YEARLY_DISCOUNT = 0.2; // 20% off with yearly billing

const featureMap: Record<string, FeatureConfig> = Object.fromEntries(
  SUBSCRIPTION_FEATURES.map((f) => [f.id, f])
);

/* ============================================
   Helpers
   ============================================ */
function getMinPrice(f: FeatureConfig): number {
  if (f.type === "radio") {
    return f.options ? Math.min(...f.options.map((o) => o.price)) : 0;
  }
  return f.monthlyPrice ?? 0;
}

function getSelectedPrice(
  f: FeatureConfig,
  enabled: Record<string, boolean>,
  radioSel: Record<string, string>,
  quantities: Record<string, number>
): number {
  if (f.type === "radio") {
    const val = radioSel[f.id];
    if (!val) return 0;
    return f.options?.find((o) => o.id === val)?.price ?? 0;
  }
  if (f.type === "quantity") {
    if (!enabled[f.id]) return 0;
    return (f.monthlyPrice ?? 0) * (quantities[f.id] ?? 1);
  }
  return enabled[f.id] ? (f.monthlyPrice ?? 0) : 0;
}

function isEnabled(
  f: FeatureConfig,
  enabled: Record<string, boolean>,
  radioSel: Record<string, string>
): boolean {
  if (f.type === "radio") return !!radioSel[f.id];
  return !!enabled[f.id];
}

interface SelectedItem {
  feature: FeatureConfig;
  label: string;
  price: number;
  optionId?: string;
  qty: number;
}

/* ============================================
   Feature Card
   ============================================ */
function FeatureCard({
  feature, billing, isOn, radioValue, quantity,
  onToggle, onRadio, onQtyChange,
}: {
  feature: FeatureConfig;
  billing: "monthly" | "yearly";
  isOn: boolean;
  radioValue?: string;
  quantity: number;
  onToggle: () => void;
  onRadio: (optId: string) => void;
  onQtyChange: (delta: number) => void;
}) {
  const Icon = feature.icon;
  const [showIncludes, setShowIncludes] = useState(false);
  const mult = billing === "yearly" ? 1 - YEARLY_DISCOUNT : 1;

  const selectedPrice = isOn
    ? Math.round(getSelectedPrice(feature, isOn ? { [feature.id]: true } : {}, radioValue ? { [feature.id]: radioValue } : {}, { [feature.id]: quantity }) * mult)
    : 0;
  const fromPrice = Math.round(getMinPrice(feature) * mult);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className={`feature-card ${isOn ? "feature-card-selected" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`feature-icon ${isOn ? "feature-icon-active" : ""}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="feature-title">{feature.title}</h4>
              <p className="feature-desc">{feature.description}</p>
            </div>
            <div className="shrink-0 pt-0.5 text-right">
              <div className="feature-price">
                {feature.type === "radio" && !radioValue ? `from ₹${fromPrice}` : isOn ? `₹${selectedPrice}` : `₹${feature.monthlyPrice ?? fromPrice}`}
              </div>
              <div className="feature-price-period">/month</div>
            </div>
          </div>

          {feature.includes && feature.includes.length > 0 && (
            <div className="mt-2.5">
              <button
                onClick={() => setShowIncludes((v) => !v)}
                className="includes-toggle"
              >
                {showIncludes ? "Hide details" : "What's included"}
                <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showIncludes ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {showIncludes && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="includes-list"
                  >
                    {feature.includes.map((inc) => (
                      <li key={inc}>
                        <Check className="h-3 w-3 shrink-0 text-accent" />
                        {inc}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4">
        {feature.type === "checkbox" && (
          <button onClick={onToggle} className={`feature-check-btn ${isOn ? "on" : ""}`}>
            <span className="feature-checkbox">
              {isOn && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span>{isOn ? "Enabled" : "Add to plan"}</span>
            <motion.span
              key={String(isOn)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`feature-check-price ${isOn ? "text-white/90" : "text-text-muted"}`}
            >
              +₹{Math.round((feature.monthlyPrice ?? 0) * mult)}/mo
            </motion.span>
          </button>
        )}

        {feature.type === "radio" && feature.options && (
          <div className="grid gap-1.5">
            {feature.options.map((opt) => {
              const selected = radioValue === opt.id;
              const optPrice = Math.round(opt.price * mult);
              return (
                <button
                  key={opt.id}
                  onClick={() => onRadio(opt.id)}
                  className={`radio-option ${selected ? "selected" : ""}`}
                >
                  <span className="radio-dot">
                    {selected && <span className="radio-dot-inner" />}
                  </span>
                  <span className="flex-1 text-left text-[12px] font-medium text-text-primary">
                    {opt.label}
                  </span>
                  <span className={`text-[11px] font-semibold ${opt.price === 0 ? "text-success" : selected ? "text-accent" : "text-text-muted"}`}>
                    {opt.price === 0 ? (opt.note ?? "Included") : `+₹${optPrice}/mo`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {feature.type === "quantity" && (
          <div className="flex items-center justify-between gap-3">
            <button onClick={onToggle} className={`feature-check-btn ${isOn ? "on" : ""}`}>
              <span className="feature-checkbox">
                {isOn && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>{isOn ? "Enabled" : "Add to plan"}</span>
            </button>
            {isOn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQtyChange(-1)}
                  className="qty-btn"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-text-primary">×{quantity}</span>
                <button
                  onClick={() => onQtyChange(1)}
                  className="qty-btn"
                  disabled={feature.maxLimit ? quantity >= feature.maxLimit : false}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ============================================
   Price Summary (desktop sticky / mobile sheet)
   ============================================ */
function PriceSummary({
  items, displayTotal, monthlyTotal, billing, subscribing,
  onRemove, onBillingChange, onCheckout,
}: {
  items: SelectedItem[];
  displayTotal: number;
  monthlyTotal: number;
  billing: "monthly" | "yearly";
  subscribing: boolean;
  onRemove: (featureId: string) => void;
  onBillingChange: (b: "monthly" | "yearly") => void;
  onCheckout: () => void;
}) {
  const annualSavings = Math.round(monthlyTotal * 12 * YEARLY_DISCOUNT);

  return (
    <div className="rounded-3xl p-1.5">
      <div className="summary-panel">
        {/* Header */}
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Your Subscription</h3>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              {items.length} {items.length === 1 ? "add-on" : "add-ons"}
            </span>
          </div>

          {/* Billing toggle */}
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-card-hover p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => onBillingChange(b)}
                className={`relative rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  billing === b ? "summary-billing-active" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {billing === b && (
                  <motion.span
                    layoutId="summary-billing-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative capitalize">{b}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="max-h-56 overflow-y-auto px-5 py-3">
          {items.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-text-muted">
              Select features to build your plan.
            </p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.feature.id + (item.optionId ?? "")}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-2 rounded-xl bg-card-hover px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-text-primary">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-bold text-accent">₹{item.price}</span>
                    <button
                      onClick={() => onRemove(item.feature.id)}
                      className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      aria-label={`Remove ${item.feature.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-border px-5 py-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] text-text-secondary">
              <span>Monthly total</span>
              <span className="font-semibold text-text-primary">₹{displayTotal}</span>
            </div>
            {billing === "yearly" ? (
              <div className="flex items-center justify-between text-[12px] text-success">
                <span>You save yearly</span>
                <span className="font-semibold">₹{annualSavings}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Yearly billing</span>
                <span className="font-semibold text-success">Save ₹{annualSavings}/yr</span>
              </div>
            )}
          </div>

          {monthlyTotal > ULTIMATE_PRICE && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-[#8B5CF6]/30 bg-gradient-to-r from-[#8B5CF6]/15 to-[#EC4899]/10 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C084FC]">
                <Sparkles className="h-3 w-3" />
                Recommended Bundle
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                You're paying <span className="font-bold text-text-primary">₹{monthlyTotal}/mo</span>. Upgrade to{" "}
                <span className="font-bold text-text-primary">Ultimate Pro</span> for ₹{ULTIMATE_PRICE}/mo and save{" "}
                <span className="font-bold text-success">₹{monthlyTotal - ULTIMATE_PRICE}/mo</span>.
              </p>
              <button className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] py-2 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)]">
                Upgrade to Ultimate
              </button>
            </motion.div>
          )}

          <button
            onClick={onCheckout}
            disabled={monthlyTotal === 0 || subscribing}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-3 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(236,72,153,0.5)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {subscribing ? "Processing..." : monthlyTotal === 0 ? "Select features to continue" : `Checkout · ₹${displayTotal}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   Smart Recommendation Card
   ============================================ */
function RecommendationCard({ from, to, billing, onAdd }: {
  from: FeatureConfig;
  to: FeatureConfig;
  billing: "monthly" | "yearly";
  onAdd: () => void;
}) {
  const Icon = to.icon;
  const mult = billing === "yearly" ? 1 - YEARLY_DISCOUNT : 1;
  const price = to.type === "radio" ? getMinPrice(to) : to.monthlyPrice ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="recommendation-row"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6]/20 to-[#EC4899]/20 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-text-muted">
          Most users who picked <span className="font-semibold text-text-primary">{from.title}</span> also add
        </div>
        <div className="text-[12px] font-semibold text-text-primary">{to.title}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[11px] font-bold text-accent">+₹{Math.round(price * mult)}/mo</div>
        <button
          onClick={onAdd}
          className="mt-1 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-3 py-1 text-[10px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(236,72,153,0.45)]"
        >
          Add
        </button>
      </div>
    </motion.div>
  );
}

/* ============================================
   Ultimate Bundle Section
   ============================================ */
function UltimateBundle({ monthlyTotal, billing }: { monthlyTotal: number; billing: "monthly" | "yearly" }) {
  const mult = billing === "yearly" ? 1 - YEARLY_DISCOUNT : 1;
  const displayUltimate = Math.round(ULTIMATE_PRICE * mult);
  const showRecommendation = monthlyTotal > ULTIMATE_PRICE;

  return (
    <section className="pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`bundle-card ${showRecommendation ? "bundle-card-highlight" : ""}`}
      >
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC4899] via-[#8B5CF6] to-[#6366F1] text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-text-primary">Ultimate Pro</h3>
                <span className="rounded-full border border-[#EC4899]/40 bg-[#EC4899]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#F472B6]">
                  RECOMMENDED
                </span>
              </div>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-text-secondary">
                Every current and future premium feature for one flat price. AI coding, waiting-room cosmetics,
                quiz creation, AI generation, reports — everything.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-center sm:text-right">
            <div className="text-2xl font-extrabold text-text-primary">₹{displayUltimate}</div>
            <div className="text-[11px] text-text-muted">/month · everything included</div>
          </div>
        </div>

        <AnimatePresence>
          {showRecommendation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-[#8B5CF6]/25 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  You're paying <span className="font-bold text-text-primary">₹{monthlyTotal}/month</span> for{" "}
                  {monthlyTotal > ULTIMATE_PRICE ? (
                    <>
                      your add-ons. Upgrade to Ultimate Pro and{" "}
                      <span className="font-bold text-success">save ₹{monthlyTotal - ULTIMATE_PRICE}/month</span>.
                    </>
                  ) : (
                    "your add-ons. Ultimate Pro covers everything for one price."
                  )}
                </p>
                <button className="shrink-0 rounded-xl bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#6366F1] px-5 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_20px_rgba(236,72,153,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(139,92,246,0.5)]">
                  Upgrade to Ultimate
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

/* ============================================
   FAQ + Payment
   ============================================ */
const FAQS = [
  { q: "Can I change my add-ons anytime?", a: "Yes! Enable or disable any feature from this page whenever you like. Charges are prorated to the day for a seamless experience." },
  { q: "How does billing work?", a: "You pay only for the features you select. Switch to yearly billing to save 20% on the entire monthly total, applied automatically." },
  { q: "What is the Ultimate Pro bundle?", a: "Ultimate Pro gives you every current and future premium feature — AI coding, waiting-room cosmetics, quiz creation limits, AI generation, reports, and management tools — for one flat ₹899/month." },
  { q: "Do students get discounts?", a: "The modular builder lets students pay only for what they actually need, so a student who just wants AI hints pays just for that. Schools and clubs can reach out for bulk Creator pricing." },
  { q: "Can I cancel anytime?", a: "Yes. Cancellations take effect at the end of the billing cycle and you keep access to paid features until then." },
];

const PAYMENT_METHODS = [
  { name: "UPI", icon: Smartphone },
  { name: "Visa", icon: CreditCard },
  { name: "MasterCard", icon: CreditCard },
  { name: "RuPay", icon: Wallet },
  { name: "Net Banking", icon: Landmark },
  { name: "Razorpay", icon: Lock },
];

/* ============================================
   Main Page
   ============================================ */
function PricingPageContent() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [radioSel, setRadioSel] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [subscribing, setSubscribing] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"all" | Audience>("all");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const { balance, stats } = useAICreditsStore();

  /* Stars for dark theme — tiny, varied, GPU-friendly */
  const stars = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.7,
        delay: `${Math.random() * 6}s`,
        duration: `${2 + Math.random() * 5}s`,
        drift: Math.random() > 0.55,
        driftDuration: `${18 + Math.random() * 14}s`,
      })),
    []
  );

  const shootingStars = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        left: `${10 + Math.random() * 60}%`,
        top: `${Math.random() * 45}%`,
        delay: `${10 + i * 14 + Math.random() * 5}s`,
        duration: `${6 + Math.random() * 3}s`,
      })),
    []
  );

  /* Derived state */
  const selectedItems: SelectedItem[] = useMemo(() => {
    const items: SelectedItem[] = [];
    SUBSCRIPTION_FEATURES.forEach((f) => {
      if (f.type === "radio") {
        const val = radioSel[f.id];
        if (!val) return;
        const opt = f.options?.find((o) => o.id === val);
        if (!opt) return;
        items.push({ feature: f, label: `${f.title} · ${opt.label}`, price: opt.price, optionId: val, qty: 1 });
      } else if (f.type === "quantity") {
        if (!enabled[f.id]) return;
        const qty = quantities[f.id] ?? 1;
        items.push({ feature: f, label: `${f.title} ×${qty}`, price: (f.monthlyPrice ?? 0) * qty, qty });
      } else {
        if (!enabled[f.id]) return;
        items.push({ feature: f, label: f.title, price: f.monthlyPrice ?? 0, qty: 1 });
      }
    });
    return items;
  }, [enabled, radioSel, quantities]);

  const monthlyTotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.price, 0),
    [selectedItems]
  );

  const displayTotal = billing === "yearly" ? Math.round(monthlyTotal * (1 - YEARLY_DISCOUNT)) : monthlyTotal;
  const annualSavings = Math.round(monthlyTotal * 12 * YEARLY_DISCOUNT);

  /* Smart recommendations */
  const activeRecs = useMemo(() => {
    const recs: { from: FeatureConfig; to: FeatureConfig }[] = [];
    SUBSCRIPTION_FEATURES.forEach((f) => {
      if (!isEnabled(f, enabled, radioSel)) return;
      (f.recommends ?? []).forEach((rid) => {
        const target = featureMap[rid];
        if (!target) return;
        if (isEnabled(target, enabled, radioSel)) return;
        recs.push({ from: f, to: target });
      });
    });
    // Deduplicate by target
    const seen = new Set<string>();
    return recs.filter((r) => {
      if (seen.has(r.to.id)) return false;
      seen.add(r.to.id);
      return true;
    });
  }, [enabled, radioSel]);

  /* Handlers */
  const handleToggle = (f: FeatureConfig) => {
    setEnabled((prev) => ({ ...prev, [f.id]: !prev[f.id] }));
  };

  const handleRadio = (f: FeatureConfig, optId: string) => {
    setRadioSel((prev) => {
      const next = { ...prev };
      if (next[f.id] === optId) {
        delete next[f.id]; // deselect
      } else {
        next[f.id] = optId;
      }
      return next;
    });
  };

  const handleQty = (f: FeatureConfig, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[f.id] ?? 1;
      const max = f.maxLimit ?? 99;
      const next = Math.min(max, Math.max(1, cur + delta));
      return { ...prev, [f.id]: next };
    });
  };

  const handleRemove = (featureId: string) => {
    const f = featureMap[featureId];
    if (!f) return;
    if (f.type === "radio") {
      setRadioSel((prev) => {
        const next = { ...prev };
        delete next[f.id];
        return next;
      });
    } else {
      setEnabled((prev) => ({ ...prev, [f.id]: false }));
    }
  };

  const handleAddRecommended = (f: FeatureConfig) => {
    if (f.type === "radio") {
      // Add the cheapest option by default so it's immediately useful
      const def = f.options?.find((o) => o.id === f.defaultOption) ?? f.options?.[0];
      if (def) setRadioSel((prev) => ({ ...prev, [f.id]: def.id }));
    } else {
      setEnabled((prev) => ({ ...prev, [f.id]: true }));
    }
  };

  const handleCheckout = async () => {
    setSubscribing(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      // Demo — in production, route to checkout
    } finally {
      setSubscribing(false);
    }
  };

  const visibleCategories = (Object.keys(CATEGORIES) as CategoryId[]).filter((cid) => {
    if (activeTab === "all") return true;
    return CATEGORIES[cid].audience === activeTab;
  });

  /* Stars component for dark theme */
  const StarField = () => (
    <div className="pricing-stars">
      {stars.map((s) => (
        <span
          key={s.id}
          className={`pricing-star ${s.drift ? "drift" : ""}`}
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--star-opacity": s.opacity,
            "--twinkle-delay": s.delay,
            "--twinkle-duration": s.duration,
            ...(s.drift
              ? {
                  "--drift-delay": `${Math.random() * 8}s`,
                  "--drift-duration": s.driftDuration,
                }
              : {}),
          } as any}
        />
      ))}
    </div>
  );

  return (
    <div className="pricing-page-content relative">
      {/* ===== Light theme background ===== */}
      <div className="pricing-bg-light absolute inset-0 -z-20">
        <div className="pricing-blob pricing-blob-1" />
        <div className="pricing-blob pricing-blob-2" />
        <div className="pricing-blob pricing-blob-3" />
      </div>

      {/* ===== Dark space background ===== */}
      <div className="pricing-bg-space absolute inset-0 -z-20 hidden dark:block">
        <StarField />
        {shootingStars.map((ss) => (
          <span
            key={ss.id}
            className="pricing-shooting-star"
            style={{
              left: ss.left,
              top: ss.top,
              "--shoot-delay": ss.delay,
              "--shoot-duration": ss.duration,
            } as any}
          />
        ))}
        <div className="pricing-nebula -left-20 top-20 h-[320px] w-[320px] bg-[#7C3AED]/20" />
        <div className="pricing-nebula -right-20 bottom-20 h-[380px] w-[380px] bg-[#EC4899]/20" style={{ animationDelay: "6s" }} />
        <div className="pricing-nebula left-1/3 top-1/2 h-[300px] w-[300px] bg-[#6366F1]/15" style={{ animationDelay: "12s" }} />
      </div>

       <div className="relative mx-auto max-w-7xl px-4 pb-36 sm:px-6 lg:pb-10">
         {/* ===== AI Credits Status (if low) ===== */}
         {balance.hasActiveSubscription && balance.monthlyAllowance > 0 && balance.remaining / balance.monthlyAllowance < 0.5 && (
           <motion.section
             initial={{ opacity: 0, y: 16 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-8"
           >
             <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10 p-5">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
                     <Sparkles className="h-5 w-5 text-accent" />
                   </div>
                   <div>
                     <h3 className="text-[12px] font-bold text-text-primary">Your AI Credits</h3>
                     <p className="text-[10px] text-text-secondary mt-0.5">
                       {balance.remaining} / {balance.monthlyAllowance} remaining · {stats.consumedThisMonth} used this month
                     </p>
                   </div>
                 </div>
                 <button
                   onClick={() => window.location.href = "/pricing#credits"}
                   className="shrink-0 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-[11px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(236,72,153,0.45)]"
                 >
                   Buy Credits
                 </button>
               </div>
             </div>
           </motion.section>
         )}

         {/* ===== Hero ===== */}
         <section className="relative pt-14 pb-10 text-center">
          <div className="pricing-hero-glow absolute inset-0 -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-[11px] font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Build your own plan
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl"
          >
            Build Your{" "}
            <span className="pricing-gradient-text">
              Perfect Plan
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Mix and match exactly the premium features you need — AI coding,
            cosmetics, reports, and more. Pay only for what you use.
          </motion.p>

          {/* Audience tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1.5"
          >
            {(["all", "student", "creator"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-full px-5 py-2 text-[12px] font-semibold capitalize transition-all duration-300 ${
                  activeTab === tab ? "audience-tab-selected" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="audience-tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {tab === "all" ? "Everything" : tab === "student" ? "For Students" : "For Creators"}
                </span>
              </button>
            ))}
          </motion.div>
        </section>

        {/* ===== Builder ===== */}
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          {/* Features */}
          <div className="min-w-0 space-y-12">
            {visibleCategories.map((cid) => {
              const cat = CATEGORIES[cid];
              const CatIcon = cat.icon;
              const catFeatures = SUBSCRIPTION_FEATURES.filter((f) => f.category === cid);
              return (
                <section key={cid}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="mb-4 flex items-start gap-3"
                  >
                    <div className="category-icon">
                      <CatIcon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary sm:text-lg">{cat.label}</h2>
                      <p className="text-[12px] text-text-secondary">{cat.desc}</p>
                    </div>
                  </motion.div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {catFeatures.map((f) => (
                      <FeatureCard
                        key={f.id}
                        feature={f}
                        billing={billing}
                        isOn={isEnabled(f, enabled, radioSel)}
                        radioValue={radioSel[f.id]}
                        quantity={quantities[f.id] ?? 1}
                        onToggle={() => handleToggle(f)}
                        onRadio={(optId) => handleRadio(f, optId)}
                        onQtyChange={(delta) => handleQty(f, delta)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Smart recommendations */}
            <AnimatePresence>
              {activeRecs.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-text-primary sm:text-lg">Smart picks for you</h2>
                    <p className="text-[12px] text-text-secondary">
                      Based on what you've selected, most users also add these.
                    </p>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {activeRecs.map((r) => (
                      <RecommendationCard
                        key={r.to.id}
                        from={r.from}
                        to={r.to}
                        billing={billing}
                        onAdd={() => handleAddRecommended(r.to)}
                      />
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Ultimate bundle */}
            <UltimateBundle monthlyTotal={monthlyTotal} billing={billing} />

            {/* ===== How AI Pricing Works ===== */}
            <section className="pt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-12 text-center"
              >
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Sparkles className="h-6 w-6 text-accent" />
                  <h2 className="text-3xl font-extrabold text-text-primary sm:text-4xl">How AI Pricing Works</h2>
                </div>
                <p className="mx-auto max-w-2xl text-sm text-text-secondary">
                  Simple. Your subscription unlocks AI features. AI Credits power your AI usage.
                </p>
              </motion.div>

              {/* Three Step Timeline */}
              <div className="grid gap-6 md:grid-cols-3 mb-12">
                {/* Step 1 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="relative rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#EC4899]/20">
                    <Crown className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-text-primary">1. Choose Subscription</h3>
                  <p className="mb-4 text-[11px] text-text-secondary">
                    Your subscription unlocks premium AI capabilities
                  </p>
                  <div className="space-y-2 text-left">
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Student Pro</div>
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-success">✓ AI Coding Companion</div>
                        <div className="text-[10px] text-success">✓ AI Hints</div>
                        <div className="text-[10px] text-success">✓ AI Debugger</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Creator Pro</div>
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-success">✓ AI Quiz Generator</div>
                        <div className="text-[10px] text-success">✓ AI Question Improver</div>
                        <div className="text-[10px] text-success">✓ AI Test Cases</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Ultimate</div>
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-success">✓ Everything included</div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-text-muted">Subscriptions renew monthly</p>
                  <div className="mt-4 flex justify-center">
                    <ChevronDown className="h-6 w-6 rotate-180 text-accent" />
                  </div>
                </motion.div>

                {/* Step 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-[#8B5CF6]/10 to-[#EC4899]/10 p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                    <Wallet className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-text-primary">2. Receive Monthly Credits</h3>
                  <p className="mb-4 text-[11px] text-text-secondary">
                    Every subscription includes a monthly allowance of AI Credits
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-card/80 p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Student Pro</div>
                      <div className="mt-1 text-2xl font-extrabold text-accent">300</div>
                      <div className="text-[10px] text-text-muted">Credits/month</div>
                    </div>
                    <div className="rounded-xl bg-card/80 p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Creator Pro</div>
                      <div className="mt-1 text-2xl font-extrabold text-accent">800</div>
                      <div className="text-[10px] text-text-muted">Credits/month</div>
                    </div>
                    <div className="rounded-xl bg-card/80 p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Ultimate</div>
                      <div className="mt-1 text-2xl font-extrabold text-accent">1800</div>
                      <div className="text-[10px] text-text-muted">Credits/month</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-text-muted">Used first whenever you use AI</p>
                  <div className="mt-4 flex justify-center">
                    <ChevronDown className="h-6 w-6 rotate-180 text-accent" />
                  </div>
                </motion.div>

                {/* Step 3 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="relative rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899]/20 to-[#EF4444]/20">
                    <ShoppingCart className="h-8 w-8 text-[#EC4899]" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-text-primary">3. Buy More If Needed</h3>
                  <p className="mb-4 text-[11px] text-text-secondary">
                    If you use all monthly credits, purchase additional packs
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Starter</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-lg font-extrabold text-text-primary">250</span>
                        <span className="text-[10px] text-text-muted">₹99</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Standard</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-lg font-extrabold text-text-primary">1000</span>
                        <span className="text-[10px] text-text-muted">₹299</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card-hover p-3">
                      <div className="text-[11px] font-semibold text-text-primary">Power User</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-lg font-extrabold text-text-primary">5000</span>
                        <span className="text-[10px] text-text-muted">₹999</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-text-muted">Never expire while active</p>
                </motion.div>
              </div>
            </section>

            {/* Visual Credit Flow */}
            <section className="py-8">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-accent/30 bg-gradient-to-r from-[#8B5CF6]/10 via-[#EC4899]/10 to-[#6366F1]/10 p-8"
              >
                <h3 className="mb-6 text-center text-xl font-bold text-text-primary">Credit Consumption Flow</h3>
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 text-center">
                    <div className="text-[12px] font-semibold text-[#8B5CF6]">Monthly Credits</div>
                    <div className="mt-2 h-2 rounded-full bg-[#8B5CF6]/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]"
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-text-muted">Used First</div>
                  </div>

                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-accent"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </motion.div>

                  <div className="flex-1 text-center">
                    <div className="text-[12px] font-semibold text-[#EC4899]">Purchased Credits</div>
                    <div className="mt-2 h-2 rounded-full bg-[#EC4899]/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#EF4444]"
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-text-muted">Used Automatically</div>
                  </div>

                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    className="text-success"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </motion.div>

                  <div className="flex-1 text-center">
                    <div className="text-[12px] font-semibold text-success">Remaining Credits</div>
                    <div className="mt-2 h-2 rounded-full bg-success/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "70%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 1.1 }}
                        className="h-full rounded-full bg-success"
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-text-muted">Stay Forever</div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Real-Life Examples */}
            <section className="pt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-8 text-center"
              >
                <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Examples</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">
                  See how credits work in real scenarios
                </p>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Student Example */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                      <GraduationCap className="h-5 w-5 text-[#8B5CF6]" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-bold text-text-primary">Student</h3>
                      <p className="text-[10px] text-text-muted">Learning with AI</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Has</span>
                      <span className="font-semibold text-text-primary">Student Pro</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Monthly Credits</span>
                      <span className="font-semibold text-text-primary">300</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Buys Extra</span>
                      <span className="font-semibold text-text-primary">1000</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="text-text-secondary">Uses</span>
                      <span className="font-semibold text-text-primary">350</span>
                    </div>
                    <div className="bg-card-hover rounded-lg p-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Monthly Credits</span>
                        <span className="font-bold text-[#EF4444]">0</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Purchased Credits</span>
                        <span className="font-bold text-success">950</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-text-muted italic">
                      Next month: 300 monthly + 950 purchased
                    </div>
                  </div>
                </motion.div>

                {/* Teacher Example */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EC4899]/20">
                      <Users className="h-5 w-5 text-[#EC4899]" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-bold text-text-primary">Teacher</h3>
                      <p className="text-[10px] text-text-muted">Creating quizzes</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Has</span>
                      <span className="font-semibold text-text-primary">Creator Pro</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Monthly Credits</span>
                      <span className="font-semibold text-text-primary">800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Creates</span>
                      <span className="font-semibold text-text-primary">2 Quizzes</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="text-text-secondary">Uses</span>
                      <span className="font-semibold text-text-primary">200 credits</span>
                    </div>
                    <div className="bg-card-hover rounded-lg p-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Monthly Remaining</span>
                        <span className="font-bold text-success">600</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Purchased</span>
                        <span className="font-bold text-text-primary">0</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-text-muted italic">
                      Unused monthly credits expire at month end
                    </div>
                  </div>
                </motion.div>

                {/* Power User Example */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.2 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6366F1]/20">
                      <Zap className="h-5 w-5 text-[#6366F1]" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-bold text-text-primary">Power User</h3>
                      <p className="text-[10px] text-text-muted">Heavy AI usage</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Has</span>
                      <span className="font-semibold text-text-primary">Ultimate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Monthly Credits</span>
                      <span className="font-semibold text-text-primary">1800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Uses</span>
                      <span className="font-semibold text-text-primary">1800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Purchases</span>
                      <span className="font-semibold text-text-primary">5000</span>
                    </div>
                    <div className="border-t border-border pt-2 bg-card-hover rounded-lg p-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Monthly Credits</span>
                        <span className="font-bold text-[#EF4444]">0</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-muted">Purchased Credits</span>
                        <span className="font-bold text-success">5000</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-text-muted italic">
                      Purchased credits stay until used
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Information Cards */}
            <section className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 p-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/20">
                      <Crown className="h-6 w-6 text-[#8B5CF6]" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">Subscription</h3>
                  </div>
                  <ul className="space-y-2 text-[11px] text-text-secondary">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                      <span>Unlocks premium AI features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                      <span>Monthly renewal with included credits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                      <span>Controls what AI tools you can access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                      <span>Examples: AI Coding, Quiz Generation, Debugging, Reports</span>
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-[#EC4899]/30 bg-gradient-to-br from-[#EC4899]/10 to-[#EC4899]/5 p-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EC4899]/20">
                      <Sparkles className="h-6 w-6 text-[#EC4899]" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">AI Credits</h3>
                  </div>
                  <ul className="space-y-2 text-[11px] text-text-secondary">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EC4899]" />
                      <span>Fuel that powers AI computations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EC4899]" />
                      <span>Consumed each time you use an AI feature</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EC4899]" />
                      <span>Can be purchased separately anytime</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EC4899]" />
                      <span>Purchased credits never expire while active</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
            </section>

             {/* ===== Credit Packs Section ===== */}
             <section id="credits" className="pt-6">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.5 }}
                 className="mb-8 text-center"
               >
                 <div className="flex items-center justify-center gap-2 mb-2">
                   <Sparkles className="h-5 w-5 text-accent" />
                   <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">AI Credit Packs</h2>
                 </div>
                 <p className="mx-auto max-w-2xl text-sm text-text-secondary">
                   Need more AI power? Pick a pack and supercharge your coding journey.
                 </p>
               </motion.div>

               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 {CREDIT_PACKS.map((pack) => (
                   <motion.div
                     key={pack.id}
                     initial={{ opacity: 0, y: 16 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.35 }}
                     className={`rounded-2xl border p-5 ${
                       pack.popular
                         ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#EC4899]/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                         : "border-border bg-card hover:border-border-hover"
                     }`}
                   >
                     {pack.popular && (
                       <div className="mb-2 text-[9px] font-bold tracking-wider text-[#C084FC]">POPULAR</div>
                     )}
                     <div className="text-[11px] font-medium text-text-muted mb-1">Pack</div>
                     <div className="text-lg font-extrabold text-text-primary mb-0.5">{pack.name}</div>
                     <div className="text-[11px] text-text-secondary mb-3">{pack.credits} credits</div>
                     
                     <div className="flex items-baseline gap-1 mb-4">
                       <span className="text-2xl font-extrabold text-text-primary">₹{pack.price}</span>
                     </div>

                     <div className="text-[10px] text-text-muted mb-4">
                       ₹{Math.round(pack.price / pack.credits * 100) / 100}/credit
                     </div>

                     <button className="w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)]">
                       Buy Pack
                     </button>
                   </motion.div>
                 ))}
               </div>

               <p className="mt-4 text-center text-[11px] text-text-muted">
                 Credits never expire while your subscription is active.
               </p>
             </section>

             {/* ===== FAQ ===== */}
             <section className="pt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-8 text-center"
              >
                <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Frequently asked questions</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">
                  Everything you need to know about modular pricing.
                </p>
              </motion.div>

              <div className="mx-auto max-w-2xl space-y-3">
                {FAQS.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <motion.div
                      key={faq.q}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={`pricing-faq-card overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isOpen
                          ? "pricing-faq-open border-accent/30 bg-card shadow-[0_0_30px_rgba(139,92,246,0.12)]"
                          : "border-border bg-card hover:border-border-hover"
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        <span className="text-[14px] font-medium text-text-primary">{faq.q}</span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            isOpen ? "bg-accent/20 text-accent" : "bg-accent/5 text-text-muted"
                          }`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <p className="px-6 pb-5 text-[13px] leading-relaxed text-text-secondary">{faq.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* ===== Payment ===== */}
            <section className="pt-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="pricing-payment-section rounded-3xl border border-border bg-card px-6 py-10 text-center"
              >
                <h3 className="text-sm font-semibold text-text-primary sm:text-base">Payments made simple</h3>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.name}
                        className="flex items-center gap-2 rounded-xl border border-border bg-accent/5 px-4 py-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-accent/30"
                      >
                        <Icon className="h-4 w-4 text-accent" />
                        {m.name}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                  <Lock className="h-3 w-3" />
                  Secure payments powered by Razorpay
                </p>
              </motion.div>
            </section>
          </div>

          {/* ===== Desktop sticky summary ===== */}
          <aside className="sticky top-24 hidden lg:block">
            <PriceSummary
              items={selectedItems}
              displayTotal={displayTotal}
              monthlyTotal={monthlyTotal}
              billing={billing}
              subscribing={subscribing}
              onRemove={handleRemove}
              onBillingChange={setBilling}
              onCheckout={handleCheckout}
            />
          </aside>
        </div>
      </div>

      {/* ===== Mobile bottom summary bar ===== */}
      <div className="mobile-summary-bar fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <button
          onClick={() => setMobileSummaryOpen(true)}
          className="flex w-full items-center justify-between px-5 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-secondary">Your plan</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              {selectedItems.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-text-primary">₹{displayTotal}</span>
            <span className="text-[10px] text-text-muted">/mo</span>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </div>
        </button>
      </div>

      {/* ===== Mobile summary bottom sheet ===== */}
      <AnimatePresence>
        {mobileSummaryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileSummaryOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[80vh] overflow-y-auto rounded-t-3xl lg:hidden"
              style={{ background: "var(--card)" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-sm font-bold text-text-primary">Your Subscription</h3>
                <button
                  onClick={() => setMobileSummaryOpen(false)}
                  className="rounded-full p-1 text-text-muted hover:bg-card-hover hover:text-text-primary"
                  aria-label="Close summary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <PriceSummary
                  items={selectedItems}
                  displayTotal={displayTotal}
                  monthlyTotal={monthlyTotal}
                  billing={billing}
                  subscribing={subscribing}
                  onRemove={handleRemove}
                  onBillingChange={(b) => {
                    setBilling(b);
                  }}
                  onCheckout={handleCheckout}
                />
              </div>
              <div className="h-8" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [showStory, setShowStory] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const handleEnterBuilder = useCallback(() => {
    setShowStory(false);
  }, []);

  return (
    <AppLayout>
      {showStory && !prefersReducedMotion ? (
        <div className="relative min-h-screen bg-[#050510]">
          <ScrollStory onEnterBuilder={handleEnterBuilder} />
        </div>
      ) : (
        <PricingPageContent />
      )}
    </AppLayout>
  );
}
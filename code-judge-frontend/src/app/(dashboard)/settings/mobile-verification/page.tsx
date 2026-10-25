import Link from "next/link";
import { ArrowLeft, Construction, Phone } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export default function MobileVerificationPage() {
  return (
    <AppLayout>
      <div className="qs-ui profile-theme relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-x-clip bg-[var(--qs-bg)] px-4 py-10">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.32]"
            style={{
              backgroundImage:
                "linear-gradient(var(--qs-line) 1px, transparent 1px), linear-gradient(90deg, var(--qs-line) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--qs-brand)]/10 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[var(--qs-sun)]/20 blur-3xl" />
        </div>

        <section className="relative z-10 w-full max-w-lg rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-7 text-center shadow-[6px_6px_0_var(--qs-sun)] sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]">
            <Phone className="h-7 w-7" />
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            <Construction className="h-3.5 w-3.5" /> Coming soon
          </div>
          <h1 className="qs-display mt-4 text-2xl font-extrabold tracking-tight text-[var(--qs-ink)]">
            Mobile number verification
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--qs-muted)]">
            Secure OTP verification for mobile numbers is being prepared. Until it launches, no
            number will be shown as verified.
          </p>
          <Link
            href="/settings#personal"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--qs-sun)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to settings
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}

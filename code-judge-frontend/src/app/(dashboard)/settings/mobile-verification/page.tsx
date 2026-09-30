import Link from "next/link";
import { ArrowLeft, Construction, Phone } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export default function MobileVerificationPage() {
  return (
    <AppLayout>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 text-center shadow-[0_20px_60px_-35px_rgba(124,92,255,.55)] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Phone className="h-7 w-7" />
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-input-bg px-3 py-1 text-[11px] font-semibold text-text-muted">
            <Construction className="h-3.5 w-3.5" /> Coming soon
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">Mobile number verification</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
            Secure OTP verification for mobile numbers is being prepared. Until it launches, no number will be shown as verified.
          </p>
          <Link
            href="/settings#personal"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" /> Back to settings
          </Link>
        </section>
      </main>
    </AppLayout>
  );
}

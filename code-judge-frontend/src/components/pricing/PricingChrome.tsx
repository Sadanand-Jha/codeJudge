import Link from "next/link";
import { SecureLogo } from "@/components/common/SecureLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

type PricingSection = "plans" | "credits";

export function PricingNav({ active }: { active: PricingSection }) {
  return (
    <nav aria-label="Main">
      <div className="wrap">
        <Link href="/" aria-label="QuizSupport home">
          <SecureLogo size={42} variant="full" rounded={false} className="logo" />
        </Link>
        <div className="nl">
          <Link href="/">Home</Link>
          <Link
            href="/pricing"
            className={active === "plans" ? "is-active" : undefined}
            aria-current={active === "plans" ? "page" : undefined}
          >
            Monthly plans
          </Link>
          <Link
            href="/pricing/credits"
            className={active === "credits" ? "is-active" : undefined}
            aria-current={active === "credits" ? "page" : undefined}
          >
            AI credits
          </Link>
          <ThemeToggle variant="icon" />
          <Link href="/login" className="btn sm">
            Log in
          </Link>
          <Link href="/register" className="btn sm pri">
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PricingFooter() {
  return (
    <footer>
      <div className="wrap">
        <SecureLogo size={34} variant="full" rounded={false} className="logo" />
        <div className="fl">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/pricing/credits">AI credits</Link>
          <Link href="/quiz">Quizzes</Link>
        </div>
      </div>
    </footer>
  );
}

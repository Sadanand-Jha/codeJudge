"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { AuthThemeControls } from "./AuthThemeChrome";
import { cn } from "@/lib/helpers";
import styles from "./AuthShell.module.css";

export interface AuthMiniCard {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "light" | "dark";
}

interface AuthShellProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  miniCards?: AuthMiniCard[];
  children: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  miniCards,
  children,
  footer,
  cardClassName,
}: AuthShellProps) {
  return (
    <div className={cn("qs-ui", styles.page)}>
      <div className={styles.hero} aria-hidden="true">
        <i className={styles.heroA} />
        <i className={styles.heroB} />
        <i className={styles.heroC} />
        <i className={styles.heroD} />
      </div>

      <Link href="/" className={styles.logo} aria-label="QuizSupport home">
        <SecureLogo size={40} variant="full" theme="dark" rounded={false} />
      </Link>

      <AuthThemeControls />

      <main className={styles.wrap}>
        <section className={styles.intro}>
          <span className={styles.pill}>{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{description}</p>

          {miniCards?.length ? (
            <div className={styles.mini}>
              {miniCards.map((card) => (
                <div
                  key={card.title}
                  className={cn(styles.miniCard, card.tone === "dark" && styles.miniCardDark)}
                >
                  <span className={styles.ico}>{card.icon}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.cardCol}>
          <div className={cn(styles.card, cardClassName)}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </section>
      </main>
    </div>
  );
}

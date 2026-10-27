"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/helpers";
import styles from "./CoinBadge.module.css";

interface CoinBadgeProps {
  balance: number;
  /** True until the first balance fetch completes; avoids flashing a fake 0. */
  loading?: boolean;
  href?: string;
  className?: string;
}

export function CoinBadge({
  balance,
  loading = false,
  href = "/creator/billing/credits",
  className,
}: CoinBadgeProps) {
  const previousBalance = useRef(balance);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (previousBalance.current === balance) return;
    previousBalance.current = balance;
    setPulse((value) => value + 1);
  }, [balance]);

  return (
    <Link
      href={href}
      title="Buy AI credits"
      aria-label={
        loading
          ? "AI credits balance loading"
          : `Coins balance: ${balance}. Buy more AI credits.`
      }
      className={cn(styles.coinBadge, className)}
    >
      <span className={styles.coin} aria-hidden="true">
        <span className={styles.coinFace}>
          <svg viewBox="0 0 24 24">
            <path
              d="M12 2.8l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.6 3.1 1.2-6.3L3 9.4l6.3-.8z"
              fill="#b36a00"
            />
          </svg>
          <span className={styles.coinGlint} />
        </span>
        <i className={cn(styles.spark, styles.s1)} />
        <i className={cn(styles.spark, styles.s2)} />
        <i className={cn(styles.spark, styles.s3)} />
      </span>
      <span
        key={pulse}
        className={cn(styles.count, pulse > 0 && styles.pop)}
      >
        {loading ? "—" : balance.toLocaleString("en-IN")}
      </span>
    </Link>
  );
}

export default CoinBadge;

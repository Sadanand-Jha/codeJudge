"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/helpers";
import styles from "./roomsCinematic.module.css";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

interface RevealWordsProps {
  text: string;
  animate: boolean;
  as?: ElementType;
  className?: string;
}

export function RevealWords({ text, animate, as: Tag = "span", className }: RevealWordsProps) {
  const words = text.split(" ");

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <span className={styles.wordMask}>
              <span
                className={cn(styles.word, animate && styles.wordAnimated)}
                style={{ "--word-i": index } as CSSProperties}
              >
                {word}
              </span>
            </span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

interface StaggerProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  animate: boolean;
  step?: number;
  baseDelay?: number;
}

export function Stagger({
  as: Tag = "div",
  children,
  className,
  animate,
  step = 120,
  baseDelay = 1800,
}: StaggerProps) {
  return (
    <Tag className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<{ className?: string; style?: CSSProperties }>;
        return cloneElement(element, {
          className: cn(element.props.className, animate && styles.staggerItemAnimated),
          style: {
            ...element.props.style,
            "--stagger-delay": `${baseDelay + index * step}ms`,
          } as CSSProperties,
        });
      })}
    </Tag>
  );
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}

export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const shown = visible || reduced;

  useEffect(() => {
    if (reduced) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <Tag
      ref={ref}
      className={cn(styles.reveal, shown && styles.revealVisible, className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

const SCRAMBLE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomRoomChars(length: number): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }
  return result;
}

interface ScrambleProps {
  text: string;
  trigger?: number;
  placeholder?: string;
  className?: string;
}

export function Scramble({ text, trigger = 0, placeholder = "------", className }: ScrambleProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(text || placeholder);

  useEffect(() => {
    if (reduced || !text) {
      setDisplay(text || placeholder);
      return;
    }

    let scrambleTimer = 0;
    let settleTimer = 0;
    let revealed = 0;
    let stopped = false;

    setDisplay(randomRoomChars(text.length));

    const settle = () => {
      revealed += 1;
      if (revealed >= text.length) {
        window.clearInterval(settleTimer);
        setDisplay(text);
        return;
      }
      setDisplay(text.slice(0, revealed) + randomRoomChars(text.length - revealed));
    };

    const startedAt = performance.now();
    scrambleTimer = window.setInterval(() => {
      if (stopped) return;
      if (performance.now() - startedAt >= 600) {
        window.clearInterval(scrambleTimer);
        settleTimer = window.setInterval(settle, 60);
        return;
      }
      setDisplay(randomRoomChars(text.length));
    }, 45);

    return () => {
      stopped = true;
      window.clearInterval(scrambleTimer);
      window.clearInterval(settleTimer);
    };
  }, [text, trigger, reduced, placeholder]);

  return (
    <span className={className}>
      <span aria-hidden="true">{display || placeholder}</span>
      <span className="sr-only">{text || placeholder}</span>
    </span>
  );
}

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
}

export function Typewriter({ text, speed = 25, className }: TypewriterProps) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) {
      setCount(0);
      return;
    }
    if (reduced) {
      setCount(text.length);
      return;
    }

    setCount(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setCount(index);
      if (index >= text.length) window.clearInterval(timer);
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed, reduced]);

  const shown = text.slice(0, count);

  return (
    <div className={cn(styles.typewriter, className)}>
      <pre className={styles.typewriterReserve} aria-hidden="true">
        {text}
      </pre>
      <pre className={styles.typewriterLive} aria-hidden="true">
        {shown}
      </pre>
      <span className="sr-only">{text}</span>
    </div>
  );
}

export type CurtainPhase = "idle" | "closing" | "opening";

export function Curtain({ phase }: { phase: CurtainPhase }) {
  if (phase === "idle") return null;

  return (
    <div className={styles.curtain} data-phase={phase} aria-hidden="true">
      <span className={cn(styles.curtainPanel, styles.curtainLeft)} />
      <span className={cn(styles.curtainPanel, styles.curtainRight)} />
    </div>
  );
}

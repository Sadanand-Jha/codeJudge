"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import LandingIllustration from "./LandingIllustration";

const WORDS = "A thoughtful paper is only a few good questions away.".split(" ");

function StatementWord({
  word,
  index,
  progress,
}: {
  word: string;
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = (index / WORDS.length) * 0.74;
  const mutedOpacity = useTransform(progress, [start, start + 0.18], [0.15, 0]);
  const revealedOpacity = useTransform(progress, [start, start + 0.18], [0, 1]);
  return (
    <span className="landing-statement-word">
      <motion.span className="landing-statement-muted" style={{ opacity: mutedOpacity }}>
        {word}
      </motion.span>
      <motion.span className="landing-statement-revealed" style={{ opacity: revealedOpacity }}>
        {word}
      </motion.span>
    </span>
  );
}

export default function LandingScrollStatement() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 82%", "end 32%"],
  });

  return (
    <section className="landing-statement-section" ref={ref} data-reveal>
      <LandingIllustration variant="statement" />
      <p className="landing-statement" aria-label={WORDS.join(" ")}>
        <span className="sr-only">{WORDS.join(" ")}</span>
        <span aria-hidden="true">
          {WORDS.map((word, index) => (
            <StatementWord
              key={`${index}-${word}`}
              word={word}
              index={index}
              progress={scrollYProgress}
            />
          ))}
        </span>
      </p>
    </section>
  );
}

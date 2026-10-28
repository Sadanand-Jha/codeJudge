"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { SecureLogo } from "@/components/common/SecureLogo";
import { SecureLandingImage } from "./SecureLandingImage";

interface ShowcaseTab {
  id: string;
  tab: string;
  heading: string;
  body: string;
  bullets: string[];
  cta: string;
  href: string;
  url: string;
  preview: ReactNode;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "builder",
    tab: "Quiz builder",
    heading: "A real builder, not a form.",
    body: "Start blank or with AI, then shape every question. Add options, mark the answer, and set marks, difficulty and time — with a student preview one click away.",
    bullets: [
      "Five-step creator studio",
      "Question editor with answer keys",
      "Marks, difficulty and timer per question",
      "Preview as a student before publishing",
    ],
    cta: "Open the quiz builder",
    href: "/creator/quizzes/create",
    url: "/creator/quizzes/create",
    preview: (
      <SecureLandingImage
        name="quiz-builder"
        alt="Quiz builder showing the question bank, question editor and question settings"
        width={1632}
        height={849}
      />
    ),
  },
  {
    id: "ai",
    tab: "AI question generator",
    heading: "Your syllabus in. A question set out.",
    body: "The AI Studio reads your files or a topic, drafts questions with answer keys, and keeps every generation ready for review.",
    bullets: [
      "Generate from PDF, DOCX, PPT, CSV or images",
      "Generate by topic, subject and difficulty",
      "Ask the assistant to refine a set",
      "Every generation saved to review later",
    ],
    cta: "Open AI Studio",
    href: "/creator/ai-studio",
    url: "/creator/ai-studio",
    preview: (
      <SecureLandingImage
        name="ai-question-generator"
        alt="AI question generator with quiz scope, syllabus topics and difficulty split"
        width={1505}
        height={869}
      />
    ),
  },
  {
    id: "bank",
    tab: "Question bank",
    heading: "Every good question, kept.",
    body: "Search, filter and preview your saved questions, then reuse them across papers without rebuilding anything.",
    bullets: [
      "Search by subject, chapter, topic or tag",
      "Filter by question type and difficulty",
      "See where each question has been used",
      "Drop any question into a new paper",
    ],
    cta: "Open the question bank",
    href: "/creator/question-bank",
    url: "/creator/question-bank",
    preview: (
      <SecureLandingImage
        name="question-bank"
        alt="Question bank with search, filters and saved questions"
        width={1668}
        height={863}
      />
    ),
  },
];

export default function StudioShowcase() {
  const [active, setActive] = useState(0);
  const [scrollDriven, setScrollDriven] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 900px) and (prefers-reduced-motion: no-preference)"
    );
    const sync = () => setScrollDriven(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: entryProgress } = useScroll({
    target: trackRef,
    offset: ["start end", "start start"],
  });

  const entryScale = useTransform(entryProgress, [0, 1], [0.9, 1]);
  const entryY = useTransform(entryProgress, [0, 1], [120, 0]);
  const entryOpacity = useTransform(entryProgress, [0, 0.7, 1], [0.15, 0.85, 1]);
  const entryBlur = useTransform(entryProgress, [0, 1], ["blur(10px)", "blur(0px)"]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!scrollDriven) return;
    const next = value < 1 / 3 ? 0 : value < 2 / 3 ? 1 : 2;
    setActive((current) => (current === next ? current : next));
  });

  const selectTab = (index: number) => {
    setActive(index);
    if (!scrollDriven) return;
    const track = trackRef.current;
    if (!track) return;
    const top = window.scrollY + track.getBoundingClientRect().top;
    const distance = Math.max(track.offsetHeight - window.innerHeight, 0);
    window.scrollTo({
      top: top + ((index + 0.5) / SHOWCASE_TABS.length) * distance,
      behavior: "smooth",
    });
  };

  const feature = SHOWCASE_TABS[active];

  return (
    <div ref={trackRef} className="ss-track">
      <div className="ss-stage">
        <motion.div
          className="ss-stage-inner"
          style={
            scrollDriven
              ? {
                  scale: entryScale,
                  y: entryY,
                  opacity: entryOpacity,
                  filter: entryBlur,
                }
              : undefined
          }
        >
          <div className="ss-head">
            <h2>
              Inside the <span className="lpx-studio-word">studio</span>.
            </h2>
            <p className="lpx-lead">
              The quiz builder, AI Studio and question bank — the same screens
              creators use every day, not a marketing mockup.
            </p>
          </div>

          <div
            className="lpx-tabs ss-tabs"
            role="tablist"
            aria-label="Creator studio designs"
          >
            {SHOWCASE_TABS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-controls={`ss-panel-${item.id}`}
                onClick={() => selectTab(index)}
              >
                {item.tab}
              </button>
            ))}
          </div>

          <div className="ss-copy-stack">
            {SHOWCASE_TABS.map((item, index) => (
              <motion.div
                key={item.id}
                id={`ss-panel-${item.id}`}
                role="tabpanel"
                aria-label={item.tab}
                aria-hidden={index !== active}
                inert={index !== active}
                className="ss-copy"
                animate={{
                  opacity: index === active ? 1 : 0,
                  filter: index === active ? "blur(0px)" : "blur(8px)",
                }}
                transition={{
                  duration: index === active ? 0.32 : 0.22,
                  delay: index === active ? 0.16 : 0,
                  ease: "easeOut",
                }}
                style={{ pointerEvents: index === active ? "auto" : "none" }}
              >
                <div className="ss-copy-main">
                  <h3>{item.heading}</h3>
                  <p className="lpx-lead">{item.body}</p>
                </div>
                <div className="ss-copy-aside">
                  <ul className="lpx-checks">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <Link className="lpx-btn" href={item.href}>
                    {item.cta} →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="ss-window">
            <div className="ss-chrome">
              <SecureLogo variant="mark" size={18} rounded={false} />
              <span className="ss-url">
                quizsupport.com
                <AnimatePresence mode="wait" initial={false}>
                  <motion.b
                    key={feature.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {feature.url}
                  </motion.b>
                </AnimatePresence>
              </span>
              <span className="ss-live">
                <i aria-hidden /> Live design
              </span>
            </div>
            <div className="ss-screen">
              <div className="ss-screen-stack">
                {SHOWCASE_TABS.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="ss-preview"
                    aria-hidden={index !== active}
                    inert={index !== active}
                    animate={{
                      opacity: index === active ? 1 : 0,
                      filter: index === active ? "blur(0px)" : "blur(6px)",
                    }}
                    transition={{
                      duration: index === active ? 0.32 : 0.22,
                      delay: index === active ? 0.16 : 0,
                      ease: "easeOut",
                    }}
                  >
                    {item.preview}
                  </motion.div>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={feature.id}
                  className="ss-scene-caption"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <span className="ss-scene-index">
                    {String(active + 1).padStart(2, "0")}
                    <i>/ 03</i>
                  </span>
                  <div>
                    <small>Inside the studio</small>
                    <b>{feature.tab}</b>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

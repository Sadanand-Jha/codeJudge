"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Clock3, UsersRound } from "lucide-react";
import SampleQuizDemo from "@/components/marketing/SampleQuizDemo";
import { SecureLandingImage } from "./SecureLandingImage";

interface ShowcaseView {
  id: string;
  label: string;
  title: string;
  description: string;
  preview: ReactNode;
}

const VIEWS: ShowcaseView[] = [
  {
    id: "ai",
    label: "AI Studio",
    title: "From your syllabus to a first draft.",
    description: "Choose a topic or upload a source, then review the generated questions.",
    preview: (
      <SecureLandingImage
        name="ai-question-generator"
        alt="AI Studio with syllabus topics and question difficulty settings"
        width={1505}
        height={869}
      />
    ),
  },
  {
    id: "builder",
    label: "Paper builder",
    title: "Make every question your own.",
    description: "Edit questions, answers, marks and timing before publishing.",
    preview: (
      <SecureLandingImage
        name="quiz-builder"
        alt="Paper builder with an editable question and quiz settings"
        width={1632}
        height={849}
      />
    ),
  },
  {
    id: "student",
    label: "Student quiz",
    title: "A student experience that just works.",
    description: "Students join in the browser and answer from a phone or laptop.",
    preview: <SampleQuizDemo label="Try a sample quiz" disableMotion />,
  },
];

const RESULTS = {
  scores: { label: "Score spread", values: [38, 64, 48, 82, 56, 73, 45, 92] },
  completion: { label: "Completion", values: [82, 58, 76, 91, 67, 84, 72, 96] },
  pace: { label: "Time taken", values: [76, 52, 69, 43, 82, 61, 88, 56] },
};

type ResultsTab = keyof typeof RESULTS;

export default function LandingProductShowcase() {
  const [activeView, setActiveView] = useState(0);
  const [resultsTab, setResultsTab] = useState<ResultsTab>("scores");
  const [rotationPaused, setRotationPaused] = useState(false);
  const [animationsPaused, setAnimationsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const reduceMotion = useReducedMotion();
  const showcaseRef = useRef<HTMLElement>(null);
  const tintMap = {
    ai: "rgba(74, 31, 184, 0.08)",
    builder: "rgba(255, 111, 177, 0.12)",
    student: "rgba(255, 199, 44, 0.12)",
  } as const;

  useEffect(() => {
    const element = showcaseRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleAnimationToggle = (event: Event) => {
      setAnimationsPaused((event as CustomEvent<{ paused: boolean }>).detail.paused);
    };
    window.addEventListener("landing-animations-toggle", handleAnimationToggle);
    return () => window.removeEventListener("landing-animations-toggle", handleAnimationToggle);
  }, []);

  useEffect(() => {
    const showStudentDemo = () => {
      setActiveView(2);
      setRotationPaused(true);
    };
    window.addEventListener("landing-student-demo", showStudentDemo);
    if (reduceMotion || rotationPaused || animationsPaused || isInteracting || !isInView) {
      return () => window.removeEventListener("landing-student-demo", showStudentDemo);
    }

    const timer = window.setInterval(() => {
      setActiveView((current) => (current + 1) % VIEWS.length);
    }, 4000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("landing-student-demo", showStudentDemo);
    };
  }, [isInView, isInteracting, reduceMotion, rotationPaused, animationsPaused]);

  const view = VIEWS[activeView];
  const result = RESULTS[resultsTab];

  return (
    <section className="landing-section landing-showcase" id="features" data-reveal>
      <div className="landing-section-heading">
        <span className="landing-eyebrow">A closer look</span>
        <h2>Everything you need to bring a paper to life.</h2>
      </div>

      <div className="landing-showcase-grid">
        <article
          ref={showcaseRef}
          className={`landing-showcase-main landing-showcase-tone-${view.id}${!isInView ? " is-offscreen" : ""}${rotationPaused || animationsPaused ? " is-paused" : ""}`}
          id="student-demo"
          aria-label="Product preview"
          style={{ background: tintMap[view.id as keyof typeof tintMap] }}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onFocusCapture={() => setIsInteracting(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false);
          }}
        >
          <div className="landing-showcase-preview">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view.id}
                className={`landing-showcase-view landing-showcase-view-${view.id}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                {view.preview}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="landing-showcase-caption">
            <div>
              <span className="landing-card-kicker">{view.label}</span>
              <h3>{view.title}</h3>
              <p>{view.description}</p>
            </div>
            <ArrowUpRight size={21} aria-hidden />
          </div>
          <div className="landing-showcase-progress" role="tablist" aria-label="Product views">
            {VIEWS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-label={`Show ${item.label}`}
                aria-selected={index === activeView}
                onClick={() => {
                  setActiveView(index);
                }}
              >
                <span
                  className={index === activeView ? "is-active" : ""}
                  key={`${item.id}-${index === activeView ? activeView : "idle"}`}
                />
              </button>
            ))}
          </div>
        </article>

        <div className="landing-showcase-aside">
          <div className="landing-fact-tiles">
            <article className="landing-fact-tile landing-fact-yellow">
              <span>Made your way</span>
              <b>Manual or AI-assisted</b>
              <p>Start from a blank paper or a topic you teach.</p>
            </article>
            <article className="landing-fact-tile landing-fact-purple">
              <span>Easy to join</span>
              <b>One shareable code</b>
              <p>Students open the quiz in their browser.</p>
            </article>
          </div>

          <article
            className="landing-results-card"
            style={{ background: view.id === "student" ? "rgba(255, 199, 44, 0.12)" : view.id === "builder" ? "rgba(255, 111, 177, 0.12)" : "rgba(74, 31, 184, 0.08)" }}
          >
            <div className="landing-results-heading">
              <div>
                <span className="landing-card-kicker">Sample results</span>
                <h3>See how the class is doing.</h3>
              </div>
              <UsersRound size={20} aria-hidden />
            </div>
            <div className="landing-results-tabs" role="tablist" aria-label="Sample class chart">
              {(Object.keys(RESULTS) as ResultsTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={resultsTab === key}
                  onClick={() => setResultsTab(key)}
                >
                  {RESULTS[key].label}
                </button>
              ))}
            </div>
            <div className="landing-chart" role="img" aria-label={`${result.label}, illustrative sample`}>
              {result.values.map((value, index) => (
                <span
                  key={`${resultsTab}-${index}`}
                  style={{ height: `${value}%`, ["--bar-index" as string]: index } as CSSProperties}
                />
              ))}
            </div>
            <div className="landing-chart-foot">
              <span><Check size={14} aria-hidden /> Sample data</span>
              <span><Clock3 size={14} aria-hidden /> Updates as students finish</span>
            </div>
          </article>
        </div>
      </div>
      <span className="sr-only" aria-live="off">
        Showing {view.label}
      </span>
    </section>
  );
}

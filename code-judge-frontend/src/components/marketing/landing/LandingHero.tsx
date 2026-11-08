"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { CSSProperties } from "react";
import LandingIllustration from "./LandingIllustration";
import LandingStudentDemoLink from "./LandingStudentDemoLink";

const DEMO_QUESTIONS = [
  "What force pulls objects toward Earth?",
  "How does friction affect a moving object?",
  "Which unit measures force?",
  "What happens when balanced forces act?",
];

function LivePaperDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const demoRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState(3);

  useEffect(() => {
    const handleAnimationToggle = (event: Event) => {
      setIsPaused((event as CustomEvent<{ paused: boolean }>).detail.paused);
    };
    window.addEventListener("landing-animations-toggle", handleAnimationToggle);
    return () => window.removeEventListener("landing-animations-toggle", handleAnimationToggle);
  }, []);

  useEffect(() => {
    const element = demoRef.current;
    if (!element || reduceMotion) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!isVisible || isPaused || reduceMotion) return;
    let timeout = 0;
    const scheduleCycle = () => {
      setPhase(0);
      timeout = window.setTimeout(() => {
        setPhase(1);
        timeout = window.setTimeout(() => {
          setPhase(2);
          timeout = window.setTimeout(() => {
            setPhase(3);
            timeout = window.setTimeout(scheduleCycle, 2000);
          }, 3500);
        }, 1000);
      }, 1500);
    };
    timeout = window.setTimeout(scheduleCycle, 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isVisible, isPaused, reduceMotion]);

  return (
    <div
      ref={demoRef}
      className={`landing-live-demo${isVisible ? " is-playing" : ""}${reduceMotion ? " is-static" : ""}${phase > 0 ? ` phase-${phase}` : ""}`}
      aria-label="Animated preview of a science paper being generated"
    >
      <div className="landing-demo-field">
        <span>TOPIC</span>
        <b>Class 9 · Science · Forces and motion</b>
        <i aria-hidden="true" />
      </div>
      <div className="landing-demo-generate">
        <Sparkles size={15} aria-hidden />
        Generate paper
      </div>
      <div className="landing-demo-questions" aria-live="off">
        {DEMO_QUESTIONS.map((question, index) => (
          <div className="landing-demo-question" key={question} style={{ "--question-index": index } as CSSProperties}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{question}</p>
            <Check size={16} aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingHero({ trialDays }: { trialDays: number }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start 90%", "end 10%"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.46, 1], [1, 1.06, 1.15]);
  const radius = useTransform(scrollYProgress, [0, 0.46, 1], ["32px", "14px", "0px"]);

  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="landing-hero-copy">
        <span className="landing-eyebrow">
          <Sparkles size={15} aria-hidden />
          A calmer way to run a classroom
        </span>
        <h1 id="landing-title">
          From syllabus to <span className="landing-hero-gradient-word">classroom-ready</span> paper.
        </h1>
        <p>
          Create a quiz by hand or let AI draft it. Share one code with your students, then
          see how everyone did.
        </p>
        <div className="landing-hero-actions">
          <Link className="landing-button landing-button-primary" href="/creator/quizzes/create">
            Create your first paper
            <ArrowRight size={17} aria-hidden />
          </Link>
          <LandingStudentDemoLink className="landing-button landing-button-outline">
            Try the student demo
            <ArrowDown size={16} aria-hidden />
          </LandingStudentDemoLink>
        </div>
        {trialDays > 0 && (
          <p className="landing-trial-note">
            <Link href="/start-free-trial">
              A {trialDays}-day Basic trial is available
            </Link>
          </p>
        )}
      </div>

      <div
        className="landing-hero-art-wrap"
        onPointerMove={(event) => {
          if (reduceMotion || event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty("--pointer-x", `${(event.clientX - bounds.left) / bounds.width - 0.5}`);
          event.currentTarget.style.setProperty("--pointer-y", `${(event.clientY - bounds.top) / bounds.height - 0.5}`);
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--pointer-x", "0");
          event.currentTarget.style.setProperty("--pointer-y", "0");
        }}
      >
        <div className="landing-fan-card landing-fan-card-yellow" aria-hidden="true" />
        <div className="landing-fan-card landing-fan-card-rose" aria-hidden="true" />
        <motion.div
          ref={panelRef}
          className="landing-hero-panel"
          style={reduceMotion ? undefined : { scale, borderRadius: radius }}
        >
          <div className="landing-panel-intro">
            <span className="landing-panel-label">
              <Sparkles size={14} aria-hidden />
              AI paper studio
            </span>
            <h2>Your topic, turned into a paper.</h2>
            <p>Choose a subject, set the scope, and review questions before you share.</p>
          </div>
          <div className="landing-screen-frame">
            <div className="landing-screen-toolbar">
              <span><i /> AI Studio</span>
              <span>Draft paper</span>
              <span>Review questions</span>
            </div>
            <LivePaperDemo reduceMotion={Boolean(reduceMotion)} />
          </div>
        </motion.div>
        <LandingIllustration variant="hero" />
      </div>
      <p className="landing-hero-caption">
        Start with a blank paper or give the AI your subject and syllabus.
      </p>
    </section>
  );
}

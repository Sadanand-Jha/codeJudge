"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ClipboardPenLine,
  FilePlus2,
  GraduationCap,
  Link2,
  Mic2,
  PieChart,
} from "lucide-react";
import LandingIllustration from "./LandingIllustration";
import LandingStudentDemoLink from "./LandingStudentDemoLink";
import { SecureLandingImage } from "./SecureLandingImage";
import { SecureLogo } from "@/components/common/SecureLogo";

const WORKFLOW = [
  {
    number: "01",
    title: "Create a paper",
    description: "Build each question yourself or ask AI for a first draft.",
    icon: FilePlus2,
    tone: "orange",
  },
  {
    number: "02",
    title: "Share a code",
    description: "Publish your quiz and give students one code to join.",
    icon: Link2,
    tone: "pink",
  },
  {
    number: "03",
    title: "Review results",
    description: "See scores, ranks and question-level performance.",
    icon: PieChart,
    tone: "purple",
  },
] as const;

export function LandingWorkflow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let frame = 0;
    const updateActiveStep = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = sectionRef.current?.querySelectorAll<HTMLElement>(".landing-workflow-card");
        if (!cards?.length) return;
        const target = window.innerHeight * 0.3;
        let nextActive = 0;
        cards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          if (rect.top <= target && rect.bottom > target) nextActive = index;
        });
        setActiveStep(nextActive);
      });
    };

    updateActiveStep();
    window.addEventListener("scroll", updateActiveStep, { passive: true });
    window.addEventListener("resize", updateActiveStep);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveStep);
      window.removeEventListener("resize", updateActiveStep);
    };
  }, []);

  return (
    <section ref={sectionRef} className="landing-section landing-workflow" id="how" data-reveal>
      <div className="landing-section-heading">
        <span className="landing-eyebrow">A simple classroom flow</span>
        <h2>Create. Share. Review.</h2>
      </div>
      <div className="landing-workflow-grid">
        {WORKFLOW.map((step, index) => {
          const Icon = step.icon;
          return (
            <article
              className={`landing-workflow-card landing-workflow-${step.tone}${activeStep === index ? " is-active" : ""}`}
              key={step.number}
            >
              <div className="landing-workflow-copy">
                <span className="landing-workflow-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <div className="landing-workflow-art" aria-hidden="true">
                {index === 0 ? (
                  <div className="landing-workflow-paper">
                    <svg viewBox="0 0 220 270">
                      <path className="landing-drawn-paper" d="M37 18h105l42 42v192H37Z" />
                      <path className="landing-paper-fold" d="M142 18v43h42" />
                      <path className="landing-written-line" style={{ "--workflow-line": 0 } as CSSProperties} d="M62 103h94" />
                      <path className="landing-written-line" style={{ "--workflow-line": 1 } as CSSProperties} d="M62 133h83" />
                      <path className="landing-written-line" style={{ "--workflow-line": 2 } as CSSProperties} d="M62 163h99" />
                      <path className="landing-written-line" style={{ "--workflow-line": 3 } as CSSProperties} d="M62 193h67" />
                    </svg>
                    <span className="landing-workflow-pencil" />
                  </div>
                ) : index === 1 ? (
                  <div className="landing-workflow-code-badge">
                    <Icon size={54} strokeWidth={1.2} />
                    <span>KQWJXHPAVMZTRNCE</span>
                    <Check className="landing-workflow-code-check" size={44} />
                  </div>
                ) : (
                  <div className="landing-workflow-chart-art">
                    {[42, 68, 54, 92].map((height, barIndex) => (
                      <i key={barIndex} style={{ "--bar-height": `${height}%`, "--bar-index": barIndex } as CSSProperties} />
                    ))}
                    <svg viewBox="0 0 100 100" className="landing-workflow-chart-star">
                      <path d="m50 6 11 31 33 1-26 20 9 32-27-19-27 19 9-32L6 38l33-1Z" />
                    </svg>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LandingRoomsPromo() {
  const benefits = [
    "Students join in seconds with one code",
    "Reuse the room across quizzes and terms",
    "See who joined, attempted, or needs a nudge",
    "Made for batches, clubs, and study groups",
  ];

  return (
    <section className="landing-section landing-room-promo" id="rooms" data-reveal>
      <div className="landing-room-promo-inner">
        <div className="landing-room-promo-copy">
          <span className="landing-eyebrow">Rooms</span>
          <h2>Your batch. Your quizzes. One room.</h2>
          <p>Create once. Share one code. Run every quiz here.</p>
          <ul>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <Check size={14} strokeWidth={3} aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="landing-room-promo-actions">
            <Link href="/creator/rooms" className="landing-room-promo-primary">
              Create a room <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/rooms" className="landing-room-promo-secondary">
              Explore rooms
            </Link>
          </div>
        </div>
        <div className="landing-room-promo-image">
          <SecureLandingImage
            name="hand-phone"
            alt="A hand holding a phone with the QuizSupport rooms page open"
            width={700}
            height={1000}
          />
        </div>
      </div>
    </section>
  );
}

const AUDIENCES = [
  {
    label: "For students",
    title: "Practice. Compete. Repeat.",
    description: "Join with a code and start answering.",
    benefits: [
      "Join a quiz with one code",
      "Attempt on your phone or laptop",
      "Practise with ready-made sets",
      "Climb ranks, with time as tiebreaker",
    ],
    action: "Find practice sets",
    href: "/quiz",
    tone: "students",
    icon: GraduationCap,
  },
  {
    label: "For teachers",
    title: "Papers in minutes",
    description: "Turn your syllabus into a ready paper.",
    benefits: [
      "AI writes questions from subjects and chapters",
      "Edit anything. Set marks and time",
      "Export print-ready PDF or Word",
      "See every result before students do",
    ],
    action: "See AI credits",
    href: "/pricing",
    tone: "teachers",
    icon: ClipboardPenLine,
  },
  {
    label: "For creators",
    title: "Host. Track. Repeat.",
    description: "Run quizzes for any batch or crowd.",
    benefits: [
      "Go live with one shareable code",
      "Schedule when quizzes open and close",
      "Add game mode and lifelines",
      "Track performance over time in rooms",
    ],
    action: "Explore rooms",
    href: "/rooms",
    tone: "creators",
    icon: Mic2,
  },
] as const;

export function LandingAudienceSection() {
  return (
    <section className="landing-section landing-audience" data-reveal>
      <div className="landing-section-heading">
        <span className="landing-eyebrow">One room, every role</span>
        <h2>Made for everyone in the room.</h2>
        <p>See what you get, whichever side you are on.</p>
      </div>
      <div className="landing-audience-grid">
        {AUDIENCES.map((audience) => {
          const Icon = audience.icon;
          return (
            <article
              className={`landing-audience-card landing-audience-${audience.tone}`}
              key={audience.tone}
            >
              <div className="landing-audience-card-header">
                <span className="landing-audience-icon">
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </span>
                <span className="landing-audience-label">{audience.label}</span>
                <h3>{audience.title}</h3>
                <p>{audience.description}</p>
              </div>
              <div className="landing-audience-card-body">
                <span className="landing-audience-benefits-label">What you get</span>
                <ul>
                  {audience.benefits.map((benefit) => (
                    <li key={benefit}>
                      <Check size={14} strokeWidth={3} aria-hidden />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link href={audience.href} className="landing-audience-action">
                  {audience.action}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const SAMPLE_QUESTIONS = [
  "Which force keeps planets in orbit around the Sun?",
  "What is the SI unit of electric current?",
  "Which process do plants use to make glucose?",
];

export function LandingPaperSample() {
  return (
    <section className="landing-paper-section" data-reveal>
      <div className="landing-paper-copy">
        <span className="landing-eyebrow">A useful starting point</span>
        <h2>Not numbers. A paper you can actually preview.</h2>
        <p>
          Start with a sample, then make the questions fit your subject, your students, and
          the way you teach.
        </p>
        <Link className="landing-text-link" href="/creator/quizzes/create">
          Make your own paper <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
      <article className="landing-paper-card" aria-label="Sample generated science paper">
        <LandingIllustration variant="proof" />
        <div className="landing-paper-topline">
          <span>QUIZSUPPORT · SAMPLE PAPER</span>
          <span>SCIENCE</span>
        </div>
        <h3>Forces, motion &amp; energy</h3>
        <p className="landing-paper-meta">Multiple choice · Answer key included</p>
        <ol>
          {SAMPLE_QUESTIONS.map((question, index) => (
            <li
              key={question}
              style={{ ["--paper-question-index" as string]: index } as CSSProperties}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{question}</p>
            </li>
          ))}
        </ol>
        <div className="landing-paper-bottom">
          <span>Generated draft · Review before sharing</span>
          <span className="landing-paper-mark">●</span>
        </div>
      </article>
    </section>
  );
}

export function LandingClosingCta() {
  return (
    <section className="landing-closing" data-reveal>
      <div className="landing-closing-inner">
        <div className="landing-closing-copy">
          <span className="landing-eyebrow">Ready when you are</span>
          <h2>Your next paper can start with one topic.</h2>
          <Link className="landing-button landing-button-closing" href="/creator/quizzes/create">
            Create your first paper <ArrowRight size={17} aria-hidden />
          </Link>
          <LandingStudentDemoLink className="landing-closing-demo-link">
            Try the student demo
          </LandingStudentDemoLink>
        </div>
        <div className="landing-closing-brand">
          <SecureLogo size={54} variant="full" theme="dark" rounded={false} />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import QuizCodeForm from "@/components/marketing/QuizCodeForm";
import SampleQuizDemo, {
  type SampleQuizQuestion,
} from "@/components/marketing/SampleQuizDemo";

interface Track {
  pill: string;
  label: string;
  questions: SampleQuizQuestion[];
}

const TRACKS: Record<string, Track> = {
  default: {
    pill: "Featured sample",
    label: "General knowledge",
    questions: [
      {
        q: "Which gas do plants take in for photosynthesis?",
        o: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
        a: 1,
      },
      {
        q: "What is the SI unit of force?",
        o: ["Joule", "Watt", "Newton", "Pascal"],
        a: 2,
      },
      {
        q: "Who chaired the drafting committee of the Indian Constitution?",
        o: ["Jawaharlal Nehru", "Sardar Patel", "Rajendra Prasad", "Dr. B. R. Ambedkar"],
        a: 3,
      },
    ],
  },
  JEE: {
    pill: "JEE Main & Adv",
    label: "JEE Main track",
    questions: [
      {
        q: "A projectile has maximum horizontal range when launched at what angle to the horizontal?",
        o: ["30°", "45°", "60°", "75°"],
        a: 1,
      },
      {
        q: "What is the hybridization of carbon atoms in benzene (C₆H₆)?",
        o: ["sp", "sp²", "sp³", "dsp²"],
        a: 1,
      },
      {
        q: "What is the derivative of ln(sin x) with respect to x?",
        o: ["tan x", "cot x", "sec x", "-csc x"],
        a: 1,
      },
    ],
  },
  NEET: {
    pill: "NEET UG",
    label: "NEET UG track",
    questions: [
      {
        q: "Which organelle is known as the powerhouse of the eukaryotic cell?",
        o: ["Golgi apparatus", "Mitochondria", "Lysosome", "Endoplasmic reticulum"],
        a: 1,
      },
      {
        q: "Which gas do plants take in for photosynthesis?",
        o: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
        a: 1,
      },
      {
        q: "Normal human blood pH is maintained within which narrow range?",
        o: ["6.40 – 6.50", "7.00 – 7.10", "7.35 – 7.45", "8.10 – 8.20"],
        a: 2,
      },
    ],
  },
  GATE: {
    pill: "GATE CS",
    label: "GATE CS track",
    questions: [
      {
        q: "Which scheduling algorithm gives the minimum average waiting time for a given set of processes?",
        o: ["FCFS", "Round Robin", "Shortest Job First", "Priority Scheduling"],
        a: 2,
      },
      {
        q: "A TLB hit ratio is 90%, TLB lookup takes 10 ns and memory access takes 100 ns. What is the effective access time?",
        o: ["110 ns", "120 ns", "190 ns", "99 ns"],
        a: 1,
      },
      {
        q: "What is the worst-case time complexity of searching a key in a balanced AVL tree?",
        o: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        a: 1,
      },
    ],
  },
  SSC: {
    pill: "SSC CGL",
    label: "SSC CGL track",
    questions: [
      {
        q: "If the cost price of 15 articles equals the selling price of 12 articles, what is the profit percentage?",
        o: ["20%", "25%", "15%", "30%"],
        a: 1,
      },
      {
        q: "What is the SI unit of force?",
        o: ["Joule", "Watt", "Newton", "Pascal"],
        a: 2,
      },
      {
        q: "Which river is also known as Dakshin Ganga in Peninsular India?",
        o: ["Krishna", "Godavari", "Kaveri", "Mahanadi"],
        a: 1,
      },
    ],
  },
  UPSC: {
    pill: "UPSC CSE",
    label: "UPSC CSE track",
    questions: [
      {
        q: "Who chaired the drafting committee of the Indian Constitution?",
        o: ["Jawaharlal Nehru", "Sardar Patel", "Rajendra Prasad", "Dr. B. R. Ambedkar"],
        a: 3,
      },
      {
        q: "Which Constitutional Amendment added Fundamental Duties (Part IVA)?",
        o: ["42nd Amendment, 1976", "44th Amendment, 1978", "73rd Amendment, 1992", "86th Amendment, 2002"],
        a: 0,
      },
      {
        q: "The Monetary Policy Committee of India is chaired ex-officio by whom?",
        o: ["Union Finance Minister", "Governor of the RBI", "Chief Economic Adviser", "NITI Aayog Vice-Chairperson"],
        a: 1,
      },
    ],
  },
  Banking: {
    pill: "IBPS & Banking",
    label: "IBPS & Banking track",
    questions: [
      {
        q: 'What does the "U" stand for in the UPI payment system in India?',
        o: ["Universal", "Unified", "Unique", "Utility"],
        a: 1,
      },
      {
        q: "At what rate does the RBI lend short-term funds to commercial banks against government securities?",
        o: ["Reverse Repo Rate", "Repo Rate", "Cash Reserve Ratio", "Statutory Liquidity Ratio"],
        a: 1,
      },
      {
        q: "A sum doubles itself in 8 years at simple interest. What is the annual rate of interest?",
        o: ["10%", "12.5%", "15%", "8.5%"],
        a: 1,
      },
    ],
  },
};

const TRACK_KEYS = Object.keys(TRACKS);
const DEMO_CODE = "VQBAMIDJETTWEFRT";

export default function LandingHero() {
  const [activeTrack, setActiveTrack] = useState("default");

  const sets = useMemo(() => {
    const track = TRACKS[activeTrack] ?? TRACKS.default;
    return [{ subject: track.label, questions: track.questions }];
  }, [activeTrack]);

  return (
    <section className="wrap hero hero-compact" aria-labelledby="landing-hero-title">
      <div>
        <div className="hero-badge">
          <strong>AI paper studio</strong>
          <span>Create quizzes with AI · Share them with a code</span>
        </div>
        <h1 id="landing-hero-title">Pick a scope. The paper writes itself.</h1>
        <p className="lead">
          Turn any syllabus, chapter or topic into a print-ready exam paper in seconds. Send
          students a single access code, and watch scores, ranks and question-level analytics
          arrive live — no app installs.
        </p>
        <QuizCodeForm demoCode={DEMO_CODE} />
        <div className="exam-tracks">
          <span className="tracks-label">Ready-made scope &amp; practice tracks</span>
          <div className="exam-pills" role="group" aria-label="Choose a sample quiz track">
            {TRACK_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="exam-pill"
                aria-pressed={activeTrack === key}
                onClick={() => setActiveTrack(key)}
              >
                {key === "default" ? `${TRACKS[key].pill} (3 Qs)` : TRACKS[key].pill}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SampleQuizDemo key={activeTrack} sets={sets} timerSeconds={45} />
    </section>
  );
}

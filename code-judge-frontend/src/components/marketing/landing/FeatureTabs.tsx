"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return { background: `hsl(${hash} 55% 42%)` };
}

const RESPONSE_ROWS = [
  { rank: 1, name: "nikki", status: "Submitted", tone: "ok", score: "10/10", gold: true },
  {
    rank: 2,
    name: "divyanshuishwar",
    status: "Submitted",
    tone: "ok",
    score: "10/10",
    gold: false,
  },
  { rank: 3, name: "pandeykun", status: "Submitted", tone: "ok", score: "8/10", gold: false },
  { rank: 4, name: "tanvi", status: "Auto", tone: "bad", score: "3/10", gold: false },
];

const SCORE_BARS = [
  { label: "2", height: "22%", peak: false },
  { label: "9", height: "82%", peak: true },
  { label: "5", height: "48%", peak: false },
  { label: "4", height: "38%", peak: false },
  { label: "1", height: "12%", peak: false },
];

interface FeatureTab {
  tab: string;
  heading: string;
  body: string;
  bullets: string[];
  preview: ReactNode;
}

const FEATURE_TABS: FeatureTab[] = [
  {
    tab: "Live quizzes",
    heading: "Share one code. Go live.",
    body: "Publish a quiz and every student joins with its access code. You see attempts, who is taking it right now and how it is going.",
    bullets: [
      "A unique access code for every quiz",
      "Auto-submit when the timer runs out",
      "End the quiz whenever you like",
    ],
    preview: (
      <>
        <span className="pl ok">● Live now</span>
        <h3 style={{ fontSize: 26, margin: "10px 0 8px" }}>
          Operating system Unit 1, 2 class quiz
        </h3>
        <span className="code">VQBA-MIDJ-ETTW-EFRT</span>
        <div className="ms">
          <div>
            <small>Attempts</small>
            <b>36</b>
          </div>
          <div>
            <small>Taking now</small>
            <b>3</b>
          </div>
          <div>
            <small>Avg score</small>
            <b>3.1</b>
          </div>
          <div>
            <small>Avg time</small>
            <b>3m 18s</b>
          </div>
        </div>
        <div className="tr">
          <i style={{ width: "83%", background: "var(--ok)" }} />
          <i style={{ width: "8%", background: "var(--bad)" }} />
          <i style={{ width: "9%", background: "var(--blue)" }} />
        </div>
      </>
    ),
  },
  {
    tab: "Responses",
    heading: "Every student, in real time.",
    body: "See submitted, in-progress and auto-submitted attempts with marks, percentage and time taken. Search, filter, sort, export or email the results.",
    bullets: [
      "Rank by marks, then by time",
      "Filter by status and search by name or roll number",
      "Download CSV or send results on email",
    ],
    preview: (
      <>
        {RESPONSE_ROWS.map((row) => (
          <div className="rw" key={row.rank}>
            <span className={row.gold ? "rk g" : "rk"}>{row.rank}</span>
            <span className="av" style={avatarStyle(row.name)}>
              {row.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b className="n">{row.name}</b>
            </div>
            <span className={`pl ${row.tone}`}>{row.status}</span>
            <b>{row.score}</b>
          </div>
        ))}
      </>
    ),
  },
  {
    tab: "Analytics",
    heading: "Know which questions work.",
    body: "Score distribution, completion funnel, hardest and easiest questions, time per question and plain-language insights, so you know what to teach again.",
    bullets: [
      "Question intelligence: hardest, easiest, slowest",
      "Drill into any student, question by question",
      "Insights generated from real data",
    ],
    preview: (
      <>
        <div className="bars">
          {SCORE_BARS.map((bar) => (
            <div className={bar.peak ? "col peak" : "col"} key={bar.label}>
              <em>{bar.label}</em>
              <div style={{ height: bar.height }} />
            </div>
          ))}
        </div>
        <div className="xl">
          <span>0</span>
          <span>5</span>
          <span>10</span>
          <span>15</span>
          <span>20</span>
        </div>
        <div className="nd">
          <span className="pl bad">Hardest</span>Q15 · 19% accuracy
        </div>
        <div className="nd">
          <span className="pl ok">Easiest</span>Q12 · 79% accuracy
        </div>
        <div className="nd">
          <span className="pl warn">Drop-off</span>3 students did not reach Q15
        </div>
      </>
    ),
  },
  {
    tab: "Game mode",
    heading: "Make quizzes fun to play.",
    body: "Add lives, lifelines and a timer. Students can use 50-50, hints, skips or extra time, and you see which power-ups they reached for.",
    bullets: [
      "Lives, 50-50, hints, skip and extra time",
      "Timer for every question",
      "Power-up and lives analytics",
    ],
    preview: (
      <>
        <div className="hr">
          <Heart size={26} fill="currentColor" />
          <Heart size={26} fill="currentColor" />
          <span style={{ opacity: 0.3 }}>
            <Heart size={26} fill="currentColor" />
          </span>
        </div>
        <div className="tr" style={{ marginBottom: 12 }}>
          <i style={{ width: "62%", background: "var(--brand)" }} />
        </div>
        <b>
          Which condition is required for a correct solution to the critical section
          problem?
        </b>
        <div className="gq">Mutual exclusion</div>
        <div className="gq x">Round robin scheduling</div>
        <div className="gq">Bounded waiting</div>
        <div className="gq x">Disk striping</div>
        <div className="lf">
          <span className="ch us">50-50</span>
          <span className="ch on">Hint</span>
          <span className="ch on">Skip</span>
          <span className="ch on">Extra time</span>
        </div>
      </>
    ),
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const feature = FEATURE_TABS[active];

  return (
    <>
      <div className="tabs" role="tablist">
        {FEATURE_TABS.map((item, index) => (
          <button
            key={item.tab}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
          >
            {item.tab}
          </button>
        ))}
      </div>
      <div className="fx">
        <div>
          <h3>{feature.heading}</h3>
          <p>{feature.body}</p>
          <ul className="ck">
            {feature.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <Link className="btn pri" href="/creator/quizzes/create">
            Try it free
          </Link>
        </div>
        <div className="outer">
          <div className="card pv">{feature.preview}</div>
        </div>
      </div>
    </>
  );
}

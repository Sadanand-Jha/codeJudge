"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return { background: `hsl(${hash} 55% 42%)` };
}

interface ResponseRow {
  rank: number;
  name: string;
  status: string;
  tone: string;
  score: string;
  gold: boolean;
  avatar?: string;
  pro?: boolean;
}

const RESPONSE_ROWS: ResponseRow[] = [
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
  {
    rank: 5,
    name: "sadanand",
    status: "In progress",
    tone: "warn",
    score: "4/10",
    gold: false,
    avatar: "/images/quiz/image7.png",
    pro: true,
  },
];

const SCORE_BARS = [
  { label: "2", height: "22%", peak: false },
  { label: "9", height: "82%", peak: true },
  { label: "5", height: "48%", peak: false },
  { label: "4", height: "38%", peak: false },
  { label: "1", height: "12%", peak: false },
];

interface FeatureTab {
  id: string;
  tab: string;
  heading: string;
  body: string;
  bullets: string[];
  preview: ReactNode;
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: "live",
    tab: "Live quizzes",
    heading: "Share one access code. Go live.",
    body: "Publish in a click. Students join with a single code — no accounts, no app. Watch attempts land in real time.",
    bullets: [
      "One access code per quiz",
      "Auto-submit when the timer ends",
      "End a live quiz whenever you like",
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
    id: "responses",
    tab: "Responses & ranks",
    heading: "Every student, ranked live.",
    body: "Submitted, in progress or auto-submitted — with marks, time and rank. Search, filter, export or email the whole room.",
    bullets: [
      "Ranked by marks, then time taken",
      "Search by name or roll number",
      "Export to CSV or email results",
    ],
    preview: (
      <>
        {RESPONSE_ROWS.map((row) => (
          <div className="rw" key={row.rank}>
            <span className={row.gold ? "rk g" : "rk"}>{row.rank}</span>
            <span className="av" style={row.avatar ? undefined : avatarStyle(row.name)}>
              {row.avatar ? (
                <img src={row.avatar} alt="" />
              ) : (
                row.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <div>
              <b className="n">{row.name}</b>
            </div>
            {row.pro ? <span className="pro">Pro</span> : null}
            <i className={`dot ${row.tone}`} title={row.status} aria-label={row.status} role="img" />
            <b>{row.score}</b>
          </div>
        ))}
      </>
    ),
  },
  {
    id: "analytics",
    tab: "Question analytics",
    heading: "Know which questions work.",
    body: "Score spread, completion rate, hardest and slowest questions — so you know exactly what to reteach.",
    bullets: [
      "Hardest, easiest and slowest questions",
      "Drill into any student's attempt",
      "Question-level insights from real data",
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
    id: "game",
    tab: "Game mode",
    heading: "Turn revision into a game.",
    body: "Lives, lifelines and a timer included. Students play — you see which power-ups they reach for.",
    bullets: [
      "Lives, 50-50, hints, skip and extra time",
      "Timer per question",
      "Power-up analytics",
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
  const [scrollDriven, setScrollDriven] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 960px) and (prefers-reduced-motion: no-preference)"
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

  const entryScale = useTransform(entryProgress, [0, 1], [0.92, 1]);
  const entryY = useTransform(entryProgress, [0, 1], [90, 0]);
  const entryOpacity = useTransform(entryProgress, [0, 0.7, 1], [0.2, 0.85, 1]);
  const entryBlur = useTransform(entryProgress, [0, 1], ["blur(10px)", "blur(0px)"]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!scrollDriven) return;
    const next = Math.min(
      Math.floor(value * FEATURE_TABS.length),
      FEATURE_TABS.length - 1
    );
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
      top: top + ((index + 0.5) / FEATURE_TABS.length) * distance,
      behavior: "smooth",
    });
  };

  return (
    <div ref={trackRef} className="ft-track">
      <div className="ft-stage">
        <motion.div
          className="ft-stage-inner"
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
          <div className="ft-head">
            <h2>The paper is only the beginning.</h2>
          </div>

          <div className="tabs ft-tabs" role="tablist" aria-label="Quiz features">
            {FEATURE_TABS.map((item, index) => (
              <button
                key={item.id}
                id={`ft-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-controls={`ft-panel-${item.id}`}
                onClick={() => selectTab(index)}
              >
                {item.tab}
              </button>
            ))}
          </div>

          <div className="ft-rail" aria-hidden="true">
            {FEATURE_TABS.map((item, index) => (
              <span
                key={item.id}
                className={index === active ? "is-active" : index < active ? "is-done" : undefined}
              >
                <i />
              </span>
            ))}
          </div>

          <div className="ft-scenes">
            {FEATURE_TABS.map((item, index) => (
              <motion.div
                key={item.id}
                id={`ft-panel-${item.id}`}
                role="tabpanel"
                aria-labelledby={`ft-tab-${item.id}`}
                aria-hidden={index !== active}
                inert={index !== active}
                className="ft-scene"
                animate={{
                  opacity: index === active ? 1 : 0,
                  y: index === active ? 0 : index < active ? -28 : 28,
                  scale: index === active ? 1 : 0.985,
                  filter: index === active ? "blur(0px)" : "blur(10px)",
                }}
                transition={{
                  duration: index === active ? 0.42 : 0.24,
                  delay: index === active ? 0.12 : 0,
                  ease: "easeOut",
                }}
                style={{ pointerEvents: index === active ? "auto" : "none" }}
              >
                <div className="ft-scene-copy">
                  <span className="ft-scene-tag">
                    <i aria-hidden />
                    Now showing · {String(index + 1).padStart(2, "0")} /{" "}
                    {String(FEATURE_TABS.length).padStart(2, "0")}
                  </span>
                  <h3>{item.heading}</h3>
                  <p>{item.body}</p>
                  <ul className="ck">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <Link className="btn pri" href="/creator/quizzes/create">
                    Try it free →
                  </Link>
                </div>
                <div className="outer">
                  <div className="card pv">{item.preview}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

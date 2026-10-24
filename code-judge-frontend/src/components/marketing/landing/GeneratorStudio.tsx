"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";

type Difficulty = "Easy" | "Medium" | "Hard";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

const DIFF_CHIP: Record<Difficulty, string> = {
  Easy: "ok",
  Medium: "warn",
  Hard: "bad",
};

const MARKS: Record<Difficulty, number> = {
  Easy: 3,
  Medium: 5,
  Hard: 8,
};

interface BankEntry {
  q: string;
  a: string;
}

const BANK: Record<string, Record<Difficulty, BankEntry>> = {
  "CPU Scheduling": {
    Easy: {
      q: "Define CPU scheduling and name two scheduling criteria.",
      a: "It selects which ready process runs next. Criteria: waiting time, turnaround time, response time.",
    },
    Medium: {
      q: "Processes P1, P2 and P3 arrive at time 0 with burst times 6, 8 and 3 ms. Find the average waiting time under SJF.",
      a: "Order P3, P1, P2 gives waits 0, 3 and 9, so the average is 4 ms.",
    },
    Hard: {
      q: "Explain how Round Robin behaves with a very large quantum and with a very small quantum.",
      a: "Very large: no preemption, so it acts like FCFS. Very small: context-switch overhead dominates and throughput drops.",
    },
  },
  Deadlocks: {
    Easy: {
      q: "State the four necessary conditions for a deadlock.",
      a: "Mutual exclusion, hold and wait, no preemption and circular wait.",
    },
    Medium: {
      q: "How does a resource allocation graph show a deadlock when every resource has a single instance?",
      a: "A cycle in the graph means the processes in it are deadlocked.",
    },
    Hard: {
      q: "A system has 12 identical resources and each process needs at most 4. What is the largest number of processes that can run with no chance of deadlock?",
      a: "Need n × (4 − 1) + 1 ≤ 12, so n ≤ 3. The answer is 3 processes.",
    },
  },
  Paging: {
    Easy: {
      q: "What is a page table?",
      a: "It maps virtual page numbers to physical frame numbers.",
    },
    Medium: {
      q: "A system has 4 KB pages, a 32-bit virtual address and 4-byte page table entries. Find the size of a single-level page table.",
      a: "2^20 pages × 4 bytes = 4 MB.",
    },
    Hard: {
      q: "A TLB lookup takes 10 ns, memory access takes 100 ns and the hit ratio is 90%. Find the effective access time.",
      a: "0.9 × (10 + 100) + 0.1 × (10 + 100 + 100) = 99 + 21 = 120 ns.",
    },
  },
  Synchronization: {
    Easy: {
      q: "What is a race condition?",
      a: "The result depends on the order in which concurrent processes access shared data.",
    },
    Medium: {
      q: "Which three conditions must a correct critical-section solution satisfy?",
      a: "Mutual exclusion, progress and bounded waiting.",
    },
    Hard: {
      q: "A semaphore S starts at 2. Five processes each run wait(S) once and none runs signal(S). How many processes block?",
      a: "Two proceed and S becomes 0, so 3 processes block.",
    },
  },
};

const TOPICS = Object.keys(BANK);

const DURATIONS = ["30", "40", "60", "90"];

interface GeneratedItem {
  id: string;
  topic: string;
  difficulty: Difficulty;
  q: string;
  a: string;
  marks: number;
}

function toItem(id: string): GeneratedItem {
  const [topic, difficulty] = id.split("|") as [string, Difficulty];
  const entry = BANK[topic][difficulty];
  return {
    id,
    topic,
    difficulty,
    q: entry.q,
    a: entry.a,
    marks: MARKS[difficulty],
  };
}

export default function GeneratorStudio() {
  const toast = useToast();

  const [topics, setTopics] = useState<string[]>(["CPU Scheduling", "Deadlocks", "Paging"]);
  const [counts, setCounts] = useState<Record<Difficulty, number>>({
    Easy: 1,
    Medium: 1,
    Hard: 1,
  });
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [paperIds, setPaperIds] = useState<string[]>([
    "Synchronization|Easy",
    "CPU Scheduling|Medium",
    "Paging|Hard",
  ]);
  const [paperTitle, setPaperTitle] = useState("OS Unit 1 · Class test");
  const [paperDuration, setPaperDuration] = useState("40");
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const messageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const generateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (messageTimer.current) clearInterval(messageTimer.current);
      if (generateTimer.current) clearTimeout(generateTimer.current);
    },
    []
  );

  const topicCount = topics.length;
  const total = counts.Easy + counts.Medium + counts.Hard;
  const paperItems = paperIds.map(toItem);
  const paperMarks = paperItems.reduce((sum, item) => sum + item.marks, 0);

  const statusText = busy
    ? busyMessage
    : topicCount
      ? total
        ? ""
        : "Pick how many you want."
      : "Pick at least one topic.";

  const toggleTopic = (topic: string) => {
    const nextTopics = topics.includes(topic)
      ? topics.filter((t) => t !== topic)
      : [...topics, topic];
    setTopics(nextTopics);
    setCounts((current) => ({
      Easy: Math.min(current.Easy, nextTopics.length),
      Medium: Math.min(current.Medium, nextTopics.length),
      Hard: Math.min(current.Hard, nextTopics.length),
    }));
    setResults([]);
  };

  const changeCount = (difficulty: Difficulty, delta: number) => {
    setCounts((current) => ({
      ...current,
      [difficulty]: current[difficulty] + delta,
    }));
  };

  const handleGenerate = () => {
    if (busy || !total || !topicCount) return;

    const messages = [
      "Reading your scope…",
      `Drafting ${topicCount} topic${topicCount > 1 ? "s" : ""}…`,
      "Balancing difficulty…",
      "Writing answer keys…",
      "Composing your paper…",
    ];

    setBusy(true);
    setBusyMessage(messages[0]);
    if (messageTimer.current) clearInterval(messageTimer.current);
    if (generateTimer.current) clearTimeout(generateTimer.current);

    let step = 0;
    messageTimer.current = setInterval(() => {
      step += 1;
      setBusyMessage(messages[step % messages.length]);
    }, 320);

    generateTimer.current = setTimeout(() => {
      if (messageTimer.current) clearInterval(messageTimer.current);
      setBusy(false);
      const generated: GeneratedItem[] = [];
      let cursor = 0;
      DIFFICULTIES.forEach((difficulty) => {
        for (let i = 0; i < counts[difficulty]; i += 1) {
          const topic = topics[cursor % topics.length];
          cursor += 1;
          generated.push(toItem(`${topic}|${difficulty}`));
        }
      });
      setResults(generated);
      setPaperIds(generated.map((item) => item.id));
      toast.success({
        title: "Paper composed",
        description: "Set the title and time, then export.",
      });
    }, 1500);
  };

  const togglePaperItem = (id: string) => {
    const inPaper = paperIds.includes(id);
    const next = inPaper ? paperIds.filter((item) => item !== id) : [...paperIds, id];
    setPaperIds(next);
    if (inPaper) {
      toast.info({ title: "Removed from your paper" });
    } else {
      toast.success({ title: `Added to your paper · ${next.length} questions` });
    }
  };

  const removePaperItem = (id: string) => {
    setPaperIds((current) => current.filter((item) => item !== id));
  };

  const handleExport = (format: string) => {
    if (!paperItems.length) {
      toast.info({ title: "Add a question to the paper first" });
      return;
    }
    toast.success({
      title: `Exported ${paperItems.length} questions as ${format} (demo)`,
    });
  };

  return (
    <>
      <section className="s" id="qgen">
        <div className="wrap fx">
          <div>
            <p className="eb">Question generator</p>
            <h3>Pick the scope. AI writes the questions.</h3>
            <p>
              Subject, chapters, topics, difficulty. Get questions with answer keys
              in seconds. Paste a syllabus for sharper results.
            </p>
            <ul className="ck">
              <li>Subject, chapter and topic</li>
              <li>Easy, medium, hard — you choose the mix</li>
              <li>MCQ, short and long, with answer keys</li>
              <li>Regenerate one or all</li>
            </ul>
            <a className="btn" href="#paper">
              Watch the paper assemble →
            </a>
          </div>
          <div className="outer">
            <div className="card">
              <div className="pvh">
                <i>
                  <Sparkles size={20} />
                </i>
                <b>AI Question Generator</b>
                <span className="pl warn">Plus</span>
              </div>
              <span className="lb">Subject</span>
              <div className="cs">
                <span className="ch on">Operating Systems</span>
              </div>
              <span className="lb">
                Topics <small className="mu">(pick at least one)</small>
              </span>
              <div className="cs">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    className="ch"
                    aria-pressed={topics.includes(topic)}
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <span className="lb">How many of each?</span>
              <div className="g3s">
                {DIFFICULTIES.map((difficulty) => (
                  <div key={difficulty}>
                    <span className="k">{difficulty}</span>
                    <div className="stp2">
                      <button
                        type="button"
                        aria-label={`Fewer ${difficulty}`}
                        disabled={counts[difficulty] <= 0}
                        onClick={() => changeCount(difficulty, -1)}
                      >
                        −
                      </button>
                      <output>{counts[difficulty]}</output>
                      <button
                        type="button"
                        aria-label={`More ${difficulty}`}
                        disabled={counts[difficulty] >= topicCount}
                        onClick={() => changeCount(difficulty, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="go"
                type="button"
                disabled={!total || !topicCount || busy}
                onClick={handleGenerate}
              >
                {busy ? "Generating…" : `Generate ${total} question${total === 1 ? "" : "s"}`}
              </button>
              <p className="stat" role="status">
                {statusText}
              </p>
              <div>
                {busy ? (
                  <>
                    <div className="skl">
                      <i style={{ width: "30%" }} />
                      <i style={{ width: "92%" }} />
                      <i style={{ width: "64%" }} />
                    </div>
                    <div className="skl">
                      <i style={{ width: "26%" }} />
                      <i style={{ width: "88%" }} />
                      <i style={{ width: "58%" }} />
                    </div>
                  </>
                ) : (
                  results.map((item) => {
                    const inPaper = paperIds.includes(item.id);
                    return (
                      <div className="qcard" key={item.id}>
                        <div className="qt">
                          <span className={`pl ${DIFF_CHIP[item.difficulty]}`}>
                            {item.difficulty}
                          </span>
                          <span className="ch on">{item.topic}</span>
                          <span className="mk mu">{item.marks} marks</span>
                        </div>
                        <p>{item.q}</p>
                        <details>
                          <summary>Answer key</summary>
                          <p className="mu">{item.a}</p>
                        </details>
                        <button
                          className="btn sm"
                          type="button"
                          aria-pressed={inPaper}
                          onClick={() => togglePaperItem(item.id)}
                        >
                          {inPaper ? "✓ In paper" : "+ Add to paper"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="s" id="paper">
        <div className="wrap fx rev">
          <div>
            <p className="eb">Paper generator</p>
            <h3>The paper comes out ready.</h3>
            <p>
              Your questions are already in. Set the title and time, then export.
              Add more from the generator above.
            </p>
            <div className="pgf">
              <label className="lb" htmlFor="paper-title">
                Paper title
              </label>
              <input
                id="paper-title"
                value={paperTitle}
                maxLength={60}
                onChange={(event) => setPaperTitle(event.target.value)}
              />
              <div className="r2">
                <div>
                  <label className="lb" htmlFor="paper-duration">
                    Duration
                  </label>
                  <select
                    id="paper-duration"
                    value={paperDuration}
                    onChange={(event) => setPaperDuration(event.target.value)}
                  >
                    {DURATIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="lb">Answer key</span>
                  <button
                    className="ch"
                    type="button"
                    aria-pressed={showAnswerKey}
                    onClick={() => setShowAnswerKey((current) => !current)}
                  >
                    Include in paper
                  </button>
                </div>
              </div>
              <p className="stat">
                {paperItems.length} question{paperItems.length === 1 ? "" : "s"} ·{" "}
                {paperMarks} marks
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn pri" type="button" onClick={() => handleExport("PDF")}>
                  Export PDF
                </button>
                <button className="btn" type="button" onClick={() => handleExport("Word")}>
                  Export Word
                </button>
              </div>
            </div>
          </div>
          <div className="outer">
            <div className="card" aria-live="polite">
              {paperItems.length ? (
                <>
                  <div className="pgh">
                    <h4>{paperTitle || "Untitled paper"}</h4>
                    <span className="mu">
                      Total marks {paperMarks} · {paperDuration} minutes
                    </span>
                  </div>
                  {paperItems.map((item, index) => (
                    <div className="pq" key={item.id}>
                      <em>Q{index + 1}</em>
                      <div className="pqb">
                        {item.q}
                        <div className="ln" />
                        <div className="ln" style={{ width: "62%" }} />
                      </div>
                      <em>{item.marks}</em>
                      <button
                        className="rm"
                        type="button"
                        aria-label={`Remove question ${index + 1}`}
                        onClick={() => removePaperItem(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {showAnswerKey && (
                    <div className="ak">
                      <b>Answer key</b>
                      {paperItems.map((item, index) => (
                        <p key={item.id}>
                          <em>Q{index + 1}.</em> {item.a}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="emp">
                  Nothing here yet.
                  <br />
                  <small>Generate a scope above and the paper fills itself.</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

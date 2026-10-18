import Link from "next/link";
import {
  ArrowUpRight,
  Binary,
  Boxes,
  Braces,
  Code2,
  Cpu,
  Database,
  GitBranch,
  GraduationCap,
  Layers3,
  MapPin,
  Network,
  Server,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { SecureLogo } from "@/components/common/SecureLogo";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "About QuizSupport",
  description:
    "QuizSupport is an online quiz platform for creating quizzes, sharing them with an access code, and getting instant results on any device.",
  path: "/about",
});

const FEATURES: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Code2,
    title: "Create a quiz in minutes",
    desc: "Write questions, mark the right answers and publish — no setup required.",
  },
  {
    icon: Users,
    title: "Share with an access code",
    desc: "Every quiz gets its own code that players can join from any device.",
  },
  {
    icon: Trophy,
    title: "Instant results",
    desc: "Players see their score the moment they submit, with a live leaderboard.",
  },
  {
    icon: Sparkles,
    title: "AI question generation",
    desc: "Turn a topic or a source document into ready-to-edit questions.",
  },
];

const FACTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: MapPin, label: "Delhi, India" },
  { icon: Trophy, label: "ICPC Regionalist" },
  { icon: GraduationCap, label: "Computer Science" },
];

const STACK: Array<{ name: string; icon: LucideIcon; color: string }> = [
  { name: "TypeScript", icon: Braces, color: "#60A5FA" },
  { name: "Node.js", icon: Server, color: "#34D399" },
  { name: "Next.js", icon: Layers3, color: "#A78BFA" },
  { name: "PostgreSQL", icon: Database, color: "#38BDF8" },
  { name: "Redis", icon: Zap, color: "#FB7185" },
  { name: "Docker", icon: Boxes, color: "#22D3EE" },
  { name: "BullMQ", icon: Workflow, color: "#FBBF24" },
  { name: "Java", icon: Cpu, color: "#F97316" },
  { name: "Python", icon: Terminal, color: "#FACC15" },
  { name: "C++", icon: Binary, color: "#818CF8" },
  { name: "LangChain", icon: GitBranch, color: "#C084FC" },
  { name: "LangGraph", icon: Network, color: "#F472B6" },
];

function GitHubMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .7A11.3 11.3 0 0 0 8.43 22.72c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.59 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.31 3.11 1.16A10.8 10.8 0 0 1 12 6.14c.96 0 1.91.13 2.81.38 2.16-1.47 3.11-1.16 3.11-1.16.62 1.56.23 2.71.12 3 .72.79 1.16 1.8 1.16 3.04 0 4.34-2.65 5.3-5.17 5.58.41.35.77 1.04.77 2.1v3.1c0 .3.2.65.78.54A11.3 11.3 0 0 0 12 .7Z" />
    </svg>
  );
}

function LinkedInMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M5.34 3.5A2.34 2.34 0 1 1 .66 3.5a2.34 2.34 0 0 1 4.68 0ZM.9 7.2h4.87V22H.9V7.2Zm7.89 0h4.67v2.02h.07c.65-1.23 2.24-2.53 4.61-2.53 4.93 0 5.84 3.25 5.84 7.47V22h-4.86v-6.95c0-1.66-.03-3.79-2.31-3.79-2.32 0-2.67 1.81-2.67 3.67V22H8.79V7.2Z" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="qs-ui qs-lp min-h-screen">
      <nav aria-label="Main">
        <div className="wrap">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={42} variant="full" rounded={false} className="logo" />
          </Link>
          <div className="nl">
            <Link href="/">Home</Link>
            <ThemeToggle variant="icon" />
            <Link href="/creator/quizzes/create" className="btn sm pri">
              Create a quiz
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <header className="wrap pg-top">
          <p className="eb">About QuizSupport</p>
          <h1>One platform for the whole quiz</h1>
          <p className="pg-lead">
            QuizSupport is an online quiz platform for creating quizzes, sharing
            them with an access code and getting instant results on any device —
            with AI-assisted question generation and live leaderboards built in.
          </p>
          <div className="pg-meta">
            <span className="pl ok">Live quizzes</span>
            <span className="pl blue">AI-assisted creation</span>
            <span className="pl mu">Instant results</span>
          </div>
        </header>

        <section className="s">
          <div className="wrap">
            <p className="eb">What it does</p>
            <h2 className="t">Everything a quiz needs, in one place</h2>
            <div className="fg">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div className="fc" key={feature.title}>
                    <i>
                      <Icon size={20} />
                    </i>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="s">
          <div className="wrap ab-dev">
            <figure className="ab-photo">
              <img
                src="/images/quiz/image7.png"
                alt="Sadanand Jha, developer of QuizSupport"
              />
              <figcaption className="ab-tag">Developer of QuizSupport</figcaption>
            </figure>

            <div>
              <p className="eb">About the developer</p>
              <h2 className="t">Built by Sadanand Jha</h2>
              <p className="ab-bio">
                QuizSupport is designed, engineered and maintained by Sadanand
                Jha — a software developer turning ambitious ideas into
                intelligent products, combining AI workflows, contest-grade
                problem solving and backend systems built to survive the real
                world. When a teacher reports a bug or a student hits a rough
                edge, feedback lands with the person who writes the code.
              </p>

              <div className="ab-facts">
                {FACTS.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <span className="pl mu" key={fact.label}>
                      <Icon size={12} />
                      {fact.label}
                    </span>
                  );
                })}
              </div>

              <div className="ab-stack" aria-label="Technologies">
                {STACK.map((tech) => {
                  const Icon = tech.icon;
                  return (
                    <span key={tech.name}>
                      <Icon size={13} style={{ color: tech.color }} />
                      {tech.name}
                    </span>
                  );
                })}
              </div>

              <div className="ab-actions">
                <Link className="btn pri" href="/meet-the-developer">
                  Meet the developer <ArrowUpRight size={16} />
                </Link>
                <a
                  className="ab-soc"
                  href="https://github.com/Sadanand-Jha"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                >
                  <GitHubMark className="h-[18px] w-[18px]" />
                </a>
                <a
                  className="ab-soc"
                  href="https://www.linkedin.com/in/sadanand-jha/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                >
                  <LinkedInMark className="h-[18px] w-[18px]" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="s" style={{ borderTop: 0 }}>
          <div className="wrap">
            <div className="cta">
              <h2>Your first quiz takes about five minutes.</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" href="/creator/quizzes/create">
                  Create a quiz
                </Link>
                <a
                  className="btn"
                  href="#top"
                  style={{
                    background: "transparent",
                    color: "var(--on-brand)",
                    borderColor: "var(--on-brand)",
                  }}
                >
                  Join with a code
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <SecureLogo size={34} variant="full" rounded={false} className="logo" />
          <div className="fl">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/quiz">Quizzes</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

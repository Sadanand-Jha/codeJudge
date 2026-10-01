"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { platformApi } from "@/services/platform";

function InitialAvatar({ name }: { name: string | null }) {
  const label = (name || "Student").trim();
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--platform-soft)] text-[10px] font-semibold text-[var(--text-secondary)]">{label.slice(0, 2).toUpperCase()}</span>;
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ users: { id: number; username: string; email: string }[]; quizzes: { id: number; name: string; code: string }[]; attempts: { id: number; status: string; username: string | null }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      platformApi
        .search(q.trim())
        .then(setResults)
        .catch(() => { /* 403 or offline — keep the palette usable */ });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const empty = results && !results.users.length && !results.quizzes.length && !results.attempts.length;

  return (
    <>
      <button onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }} className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]">
        <Search size={13} /><span className="hidden sm:inline">Search</span><kbd className="rounded border border-[var(--border)] px-1 text-[9px] text-[var(--text-muted)]">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Platform command palette">
          <div onMouseDown={(e) => e.stopPropagation()} className="pf-reveal w-full max-w-xl overflow-hidden rounded-[14px] border border-[var(--border-hover)] bg-[var(--popover)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setResults(null); }} placeholder="Search students, assessments, rooms, attempts…" className="h-13 min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">ESC</kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!results && <div className="px-3 py-8 text-center text-[12px] text-[var(--text-muted)]">Type at least two characters to search real platform data.</div>}
              {empty && <div className="px-3 py-8 text-center text-[12px] text-[var(--text-secondary)]">No matching students, assessments, or attempts.</div>}
              {results?.users.map((u) => <div key={`u${u.id}`} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><InitialAvatar name={u.username} /><div><div className="text-[var(--text-primary)]">{u.username}</div><div className="text-[10px] text-[var(--text-muted)]">Student · {u.email}</div></div></div>)}
              {results?.quizzes.map((z) => <Link onClick={() => setOpen(false)} key={`q${z.id}`} href={`/quiz/${z.code}`} className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><span><span className="text-[var(--text-primary)]">{z.name}</span><span className="ml-2 text-[10px] text-[var(--text-muted)]">Assessment</span></span><ArrowUpRight size={13} className="text-[var(--text-muted)]" /></Link>)}
              {results?.attempts.map((a) => <div key={`a${a.id}`} className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><span className="text-[var(--text-primary)]">Attempt #{a.id}</span><span className="text-[10px] text-[var(--text-muted)]">{a.username ?? "Student"} · {a.status}</span></div>)}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[9px] text-[var(--text-muted)]"><span>Students · Assessments · Attempts</span><span>CodeJudge owner search</span></div>
          </div>
        </div>
      )}
    </>
  );
}

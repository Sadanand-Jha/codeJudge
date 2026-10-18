"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, LogIn, Send } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { submitFeedback } from "@/services/feedback";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
} from "@/config/feedback";

export default function FeedbackForm() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0].id);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const selected =
    FEEDBACK_CATEGORIES.find((option) => option.id === category) ?? FEEDBACK_CATEGORIES[0];
  const trimmed = message.trim();
  const canSend =
    trimmed.length >= FEEDBACK_MESSAGE_MIN && trimmed.length <= FEEDBACK_MESSAGE_MAX;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || phase === "sending") return;
    setPhase("sending");
    setError("");
    try {
      await submitFeedback({ category, message: trimmed });
      setMessage("");
      setPhase("sent");
    } catch (err) {
      setPhase("idle");
      setError(getApiErrorMessage(err, "Could not send your feedback. Please try again."));
    }
  };

  if (!hasHydrated) {
    return (
      <div className="card ct-form">
        <h2>Share feedback</h2>
        <p className="ct-sub">Checking your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="card ct-form">
        <span className="fb-lock">
          <Lock size={18} />
        </span>
        <h2>Log in to send feedback</h2>
        <p className="ct-sub">
          Feedback is tied to your account so the team can follow up and fix
          things faster. It only takes a minute.
        </p>
        <div className="ct-actions">
          <Link className="btn pri" href="/login" style={{ gap: 8 }}>
            <LogIn size={16} />
            Log in
          </Link>
          <Link className="btn" href="/register">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "sent") {
    return (
      <div className="card ct-form">
        <span className="fb-check">
          <CheckCircle2 size={20} />
        </span>
        <h2>Thanks — feedback received</h2>
        <p className="ct-sub">
          Your message is with the team. If it needs a reply, we will email you
          {user?.email ? ` at ${user.email}` : ""}.
        </p>
        <div className="ct-actions">
          <button type="button" className="btn" onClick={() => setPhase("idle")}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card ct-form" onSubmit={handleSubmit}>
      <h2>Share feedback</h2>
      <p className="ct-sub">
        Pick a category, tell us what happened, and it goes straight to the
        QuizSupport team.
      </p>

      <div className="fb-cats" aria-label="Feedback category">
        {FEEDBACK_CATEGORIES.map((option) => (
          <button
            type="button"
            key={option.id}
            className={option.id === category ? "fb-chip on" : "fb-chip"}
            aria-pressed={option.id === category}
            onClick={() => setCategory(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="fb-hint">{selected.hint}</p>

      <label className="ct-label" htmlFor="fb-message">
        Your message
      </label>
      <textarea
        id="fb-message"
        className="ct-field"
        rows={6}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="What happened, or what would you like to see? Add steps or a quiz code if it helps."
        maxLength={FEEDBACK_MESSAGE_MAX}
      />

      <div className="fb-foot">
        <span
          className={
            trimmed.length > 0 && trimmed.length < FEEDBACK_MESSAGE_MIN
              ? "fb-count warn"
              : "fb-count"
          }
        >
          {trimmed.length}/{FEEDBACK_MESSAGE_MAX}
        </span>
        <button className="btn pri" type="submit" disabled={!canSend || phase === "sending"}>
          <Send size={16} />
          {phase === "sending" ? "Sending…" : "Send feedback"}
        </button>
      </div>
      {error ? (
        <p className="fb-error" role="alert">
          {error}
        </p>
      ) : null}
      {user?.email ? <p className="ct-note">Signed in as {user.email}</p> : null}
    </form>
  );
}

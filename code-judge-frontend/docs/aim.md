# The Aim of QuizSupport

**One sentence:** QuizSupport exists to make fair, high-quality assessment accessible to everyone — so a teacher anywhere can run a trustworthy exam, and a student anywhere can prepare for the exam that decides their future.

We started building in July 2026. This document records what we are trying to do, what already works, and where we are going. It is both a public statement of intent and an internal reference for product decisions.

---

## 1. Why we exist

Assessment is one of the highest-leverage parts of education. A good test tells a student exactly where they stand. A bad test wastes their time, and an unfair one damages trust.

Most people still assemble this from disconnected tools: a form builder for questions, a video call for invigilation, a spreadsheet for marks, and a messaging group for results. Teachers spend hours on logistics instead of teaching. Students get a score but little insight. And online tests are easy to cheat when nobody is watching.

QuizSupport brings the whole loop into one place: create an assessment, share it with a code, run it under fair conditions, and get results that mean something.

## 2. Who this is for

- **Students** preparing for UPSC, JEE, NEET, GATE, SSC, Banking, CUET, CAT, and other exams. They need realistic practice, honest feedback, and mock tests that feel like the real thing.
- **Teachers and creators** who want to build a quiz or a full test series without engineering, hosting, or payment infrastructure.
- **Institutions, coaching centres, and clubs** that need controlled access, batches or rooms, and a clear view of performance.
- **Anyone** who wants to ask a few questions and get a fair, instant result — the simplest use case should remain simple.

## 3. The aim

To make the following true for every user:

1. **Creating an assessment takes minutes, not days.** Questions, answer keys, scheduling, and access control should be one flow.
2. **Joining takes one code.** No accounts to chase, no links that break, no device restrictions that exclude students on low-end phones.
3. **The result is trustworthy.** Anti-cheat is built into the exam, not bolted on afterwards, and every flagged attempt is explainable.
4. **Teachers can earn from their work.** A good teacher should be able to sell a test series and keep the majority of the revenue, without paying upfront for software they may not need yet.
5. **Students can practise deliberately.** Practice should adapt to the exam, the syllabus, and the student's weak areas — not just serve a random question set.

## 4. What we believe

- **Fairness is a feature.** A score is only useful if students believe the conditions were the same for everyone.
- **One code should be enough.** Access should not depend on technical confidence.
- **Teachers own their content and their audience.** The platform should be a partner, not a landlord.
- **Privacy is not negotiable.** Student data is never sold, and proctoring data is collected only to protect exam integrity.
- **Robustness beats feature count.** An exam that crashes at scale is worse than an exam with fewer options.
- **No pay-to-win.** Paying can buy convenience and content. It must never buy a better rank or an unfair advantage.
- **Clarity over dark patterns.** Pricing, renewals, refunds, and platform fees should be readable in one sitting.

## 5. What exists today

The platform is live and usable. The core loop is built end to end.

**Quiz creation and access**
- A quiz studio for building questions, setting marks, negative marking, time limits, shuffling, and lifelines.
- Visibility modes: public, private, unlisted, invite-only, classroom/batch, college, company, organization, and contest-only.
- Persistent **rooms** for student groups, reusable across quizzes.
- A **join-by-code** flow: students enter a code and start the quiz on any device.
- Live rooms, waiting rooms, leaderboards, results review, and creator analytics.

**Exam integrity**
- Fullscreen enforcement during an attempt.
- Tab-switch and window-blur detection.
- Copy, cut, and paste restrictions.
- Server-reported violations with a configurable limit.
- Automatic submission and flagging when the limit is reached, so attempts can be reviewed rather than silently accepted.

**Practice and generation**
- AI-assisted question and paper generation, including generating test sections from an uploaded PDF.
- Practice streams for major exams, including JEE, NEET, and UPSC.
- A question bank, paper export to PDF/Word, and AI credits for metered usage.

**What is not live yet**
- The teacher marketplace and payouts are in active development. The screens exist, but selling is deliberately on hold until payments, refunds, tax handling, and dispute processes are ready.
- Student-generated full-length mock tests are a goal, not a shipped guarantee. Current generation is creator-facing and question/paper-level.
- Stronger proctoring signals (device, session, and behavioural anomaly detection) are roadmap items.

## 6. Where we are going

### 6.1 Mock tests students can generate

A student should be able to say: "Give me a full-length JEE Main mock, Physics weak, 3 hours, latest pattern" — and receive a timed, balanced paper with a real marking scheme and a review that explains every mistake. The same should work for UPSC prelims, NEET, GATE, SSC, and Banking.

This requires more than a prompt. It requires syllabus maps, exam patterns, previous-year coverage, difficulty calibration, and quality checks so generated papers are realistic and not repetitive. That is the work ahead.

### 6.2 A teacher marketplace for test series

Teachers should be able to publish a free or paid test series, reach students beyond their own batch, and build a reputation through ratings and results. Students should be able to compare series by exam, difficulty, language, price, and creator — with enough information to choose honestly.

### 6.3 Pay-as-you-go for teachers

Teachers should not need a subscription to start. Listing is free. The platform earns only when the teacher earns.

- **Teacher keeps:** 80%
- **Platform keeps:** 20% (a 1/5th cut)
- **Upfront cost:** none

For example, on a ₹199 sale, the teacher receives ₹159.20 and the platform receives ₹39.80, before applicable taxes and payment-gateway charges. If the teacher makes no sale, the teacher pays nothing.

This model keeps incentives aligned: we only do well when teachers sell work students actually value. Advertising, if a teacher chooses to use it, is a separate cost and is never mixed with the sales commission.

### 6.4 Stronger, explainable anti-cheat

The next layer is not more pop-ups. It is better evidence:

- Attempt-level violation timelines that a teacher can review.
- Anomaly detection for impossible answer patterns and unusual timing.
- Device and session consistency signals.
- Clear appeal and review flows so an honest student is not punished by a false positive.

Anti-cheat should protect fair students, not intimidate them.

### 6.5 Reliability at exam scale

Thousands of students starting at the same second is a different engineering problem from a classroom quiz. We are building for that: queued grading, idempotent submissions, graceful degradation, and a clear status for every attempt. An exam result should never be lost because a network request failed.

## 7. How we measure success

We will judge the platform by outcomes, not by the number of features shipped:

- **Fairness:** the share of flagged attempts that survive review, and the false-positive rate.
- **Learning:** whether students return, improve, and can identify their weak topics.
- **Teacher outcomes:** the number of teachers earning, and the share of revenue that reaches them.
- **Reliability:** attempt completion rate and grading success under peak load.
- **Accessibility:** successful joins on low-end devices and slow networks.
- **Trust:** refund rate, complaint rate, and how quickly issues are resolved.

## 8. What we will not do

- We will not sell student data or proctoring data.
- We will not sell rank, leaderboard position, or a passing score.
- We will not hide fees, auto-renew without clear consent, or make cancellation difficult.
- We will not call a paper "mock" if it is not calibrated to the real exam.
- We will not punish a student on a single ambiguous signal without a review path.

## 9. The long view

QuizSupport should become the place where an assessment is created, shared, taken, and trusted — regardless of whether it is a five-question classroom quiz or a full-length national-level mock.

The measure of success is simple: a teacher can build a fair exam in minutes, a student can prepare with confidence, and both can trust the result. Everything else is implementation detail.

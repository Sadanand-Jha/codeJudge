# Independence and Differentiation: QuizSupport and QuizAttempt

**Author:** Sadanand Jha
**Date:** 20 October 2026
**Subject:** Clarification of the independent origin of QuizSupport and how it differs from QuizAttempt

---

## 1. Purpose of this document

This document responds to the suggestion that QuizSupport copies QuizAttempt.

It does three things:

1. Establishes the timeline: QuizSupport was created and substantially built before I joined QuizAttempt as an intern.
2. Compares the two products at the level of aim, users, access model, content model, anti-cheat design, monetization, and architecture.
3. States clearly that no code, design, content, data, or proprietary material was copied from QuizAttempt, and lists how that can be verified.

This is a factual clarification based on repository history and product inspection. It is not a legal opinion. The comparison uses only high-level product descriptions, repository structure, and commit metadata; it does not reproduce QuizAttempt's source code, confidential data, or business information.

---

## 2. Summary

- QuizSupport is my project. Its first commit is dated **9 July 2026**.
- My internship at QuizAttempt ran from **6 September 2026 to 3 October 2026**.
- I have **197 commits in QuizSupport before 6 September 2026**. The core modules in question were already built: quiz studio, quiz settings, join-by-code flow, rooms, test-series UI, exam-prep streams, AI question generation, and the exam-mode anti-cheat shell.
- My first commit in the QuizAttempt repository is dated **14 September 2026**. All seven of my commits there are dated **14–30 September 2026**, and they are frontend UI fixes, not core assessment or anti-cheat work.
- After the internship ended on **3 October 2026**, I continued building QuizSupport independently: I acquired the **quizsupport.com** domain, rebranded the product from its working name to QuizSupport, connected the production API, and added the subscription and billing foundation.
- The two products solve different problems for different users. They share only the generic category of "online assessment", in the same way two banking apps share the category of "banking".
- No source file, component, database schema, API contract, design asset, or dataset from QuizAttempt exists in QuizSupport. The two codebases use different backend languages and architectures.

---

## 3. Timeline

| Date | Event | Evidence |
|---|---|---|
| 3 May 2026 | QuizAttempt repository first commit by its founder | QuizAttempt git history |
| **9 July 2026** | **QuizSupport first commit by me** | `52fbef0` — "a normal commit" |
| 1–2 August 2026 | Quiz builder UI and quiz settings created | `db499a8`, `9596c52` |
| 4 August 2026 | Anti-copy / attempt protection utilities added | `c8f2a19` and related commits |
| 8 August 2026 | Quiz creation page and quiz settings design | `6ad4d40`, `9cf9f7e` |
| 19 August 2026 | Rooms and test-series module added | `0f052c4` |
| 20 August 2026 | Exam-prep streams, creator studio, test pages added | `5bffbda`, `57e01b0` |
| 21 August 2026 | AI quiz-generation studio UI added | `ac973c6` |
| 22 August 2026 | Quiz creation and join-by-code flow working | `4ff1710` |
| 1–2 September 2026 | Exam-mode shell for timed, monitored attempts created | `847413c`, `afd3cc9` |
| **6 September 2026** | **QuizAttempt internship begins** | Joining communication; screen recording available |
| **14 September 2026** | **First commit by me in QuizAttempt** | `c59ec846` |
| 14–30 September 2026 | Seven UI-focused commits in QuizAttempt | Commit list in section 7 |
| **3 October 2026** | **QuizAttempt internship ends** | Internship record |
| October 2026 | quizsupport.com acquired; product rebranded to QuizSupport; production API connected | Domain record; `08642f0`, `8d2c74c` |
| 18 October 2026 | SEO and canonical URLs updated for quizsupport.com | `ea70a12` |
| 20 October 2026 | This document written | — |

By 6 September 2026, QuizSupport already had **197 commits** and a working product. The relevant modules were not added after I saw QuizAttempt's code; they existed before I had access to it.

The QuizSupport repository is private: `https://github.com/Sadanand-Jha/codeJudge`. I can provide read access, commit hashes, and dated commit output on request so the history can be verified independently.

---

## 4. What QuizAttempt is

QuizAttempt describes itself as a **learning-intelligence platform that aggregates and analyses student performance across institutions**.

Its defining idea is the **Global Student ID (GSID)**: a single student can belong to multiple organizations, and an identity-graph engine unifies their records so a parent sees one view of their child across schools.

Its primary users are institutions:

- Platform admins
- Organization admins
- Principals
- Teachers
- Parents
- Students, who do **not** log in and participate only through secure, time-bound test links

Its content model is built around **school-specific question-paper blueprints**: sections, marks distributions, subject-specific question archetypes, and per-school exam patterns. Its analytics are oriented around cross-institution student performance, parent visibility, and institutional reporting. Its backend is Java 21 / Spring Boot 3.3, a multi-module Maven service with Liquibase migrations.

In short: QuizAttempt is an **institutional learning-intelligence and school assessment system**.

---

## 5. What QuizSupport is

QuizSupport is an **open assessment and exam-preparation platform**. Its aim is that anyone can create a quiz, share it with a code, run it fairly, and get a result they can trust.

Its primary users are:

- Individual students preparing for UPSC, JEE, NEET, GATE, SSC, Banking, CUET, CAT, and similar exams
- Teachers and independent creators who want to author and distribute assessments
- Coaching centres, batches, and institutions that need rooms and controlled access

Its defining ideas are:

- **Code-first distribution:** a quiz is shared with a short access code, not an institutional link.
- **Open creation:** anyone can build a quiz; it is not gated behind a school onboarding process.
- **Fair online exams:** an exam-mode shell with fullscreen enforcement, tab/window detection, copy and paste blocking, server-reported violations, and automatic submission or flagging at a configured limit.
- **Exam preparation at scale:** practice streams and AI-assisted question and paper generation for competitive exams.
- **A creator economy:** teachers can publish free or paid test series. The intended model is pay-as-you-go, with the teacher keeping 80% and the platform taking a 1/5th (20%) cut on sales.

Its backend is TypeScript / Express with PostgreSQL, Redis, BullMQ, and Judge0 for code execution.

In short: QuizSupport is an **open, code-first assessment and exam-prep platform with a creator marketplace**.

---

## 6. The aims are different

The difference is not cosmetic. The two products start from different questions.

**QuizAttempt starts with:** "How does an institution understand a student across every school they attend?"

That leads to GSIDs, organization hierarchies, parent accounts, principal approvals, school-specific paper blueprints, and cross-institution analytics. The unit of value is the institution and the longitudinal student record.

**QuizSupport starts with:** "How does anyone create a fair assessment and get it to the right people in minutes?"

That leads to quiz codes, public/private/room visibility, join-by-code, exam-mode anti-cheat, AI-generated mock tests, competitive-exam practice, and a teacher marketplace. The unit of value is the assessment and the person creating or taking it.

Those are different theses. A school blueprint engine and a code-first quiz marketplace are not the same idea, even though both contain quizzes.

### 6.1 Key differences at a glance

| Dimension | QuizAttempt | QuizSupport |
|---|---|---|
| Primary customer | Schools and institutions | Individual creators, teachers, students, coaching batches |
| Core thesis | Cross-institution learning intelligence via GSID | Open, code-first assessment and exam preparation |
| Student access | No student account; secure time-bound links | Student account; short quiz code, rooms, invites |
| Content model | Per-school paper blueprints and question archetypes | Creator-authored question bank, AI-generated papers, exam streams |
| Authoring flow | Class → subject → exam type → blueprint-driven paper | Quiz studio → questions → marks/rules → publish → share code |
| Distribution | Shared or individual test links | Quiz code, public/private/room/invite/contest visibility |
| Analytics | Cross-org student analytics for teachers, admins, parents | Creator dashboards, leaderboards, attempt review, student progress |
| Anti-cheat | Tab-switch, paste, resume, and screenshot counters; auto-submit on tab switch | Exam shell with fullscreen, tab/window detection, copy/paste blocking, violation limit, server reporting, auto-submit/flag |
| Monetization | Institutional plans, usage, and purchases | Creator subscriptions and AI credits; planned 80/20 teacher marketplace |
| Exam focus | School curriculum and internal exams | UPSC, JEE, NEET, GATE, SSC, Banking, CUET, CAT, programming/DSA |
| Backend | Java 21, Spring Boot 3.3, Maven, Liquibase | TypeScript, Express, PostgreSQL, Redis, BullMQ, Judge0 |
| Marketplace | No teacher test-series marketplace or 80/20 creator payout model found in the inspected repository | Teacher test-series marketplace with 80/20 pay-as-you-go model (being built) |

### 6.2 On anti-cheat

Both products take exam integrity seriously, and both have anti-cheat signals. That is a category requirement, not a copied feature.

QuizAttempt's inspected repository exposes counters for tab switches, paste attempts, resumes, and screenshot attempts, and can auto-submit on a tab switch.

QuizSupport's exam mode is built differently: it renders a dedicated exam shell, enforces fullscreen, detects tab/window changes and navigation, blocks copy/cut/paste, reports each violation to the backend, enforces a configurable violation limit, and auto-submits and flags an attempt when the limit is reached. The implementation, data flow, and product experience are separate.

I did not port QuizAttempt's `AntiCheatSummary`, its counters, or its attempt flow into QuizSupport. QuizSupport's exam shell and violation flow were written in its own TypeScript codebase.

### 6.3 On AI generation

Both products can generate questions with AI. Again, this is a category-level capability that many assessment products now have.

QuizAttempt generates quizzes, question papers, worksheets, lesson plans, and concept explanations using its Java backend and an LLM provider.

QuizSupport generates questions and papers inside its creator studio, with its own prompts, credit system, UI, and backend flow. The two implementations do not share prompts, code, models, or data.

---

## 7. What I actually did during the QuizAttempt internship

I made seven commits in the QuizAttempt repository, all between 14 and 30 September 2026:

| Commit | Date | Scope |
|---|---|---|
| `c59ec846` | 14 Sep 2026 | Tooltip for the "add child" button |
| `af3475a7` | 14 Sep 2026 | Remove tooltip on scroll |
| `086e0291` | 20 Sep 2026 | Parent dashboard null handling and layout polish |
| `5deac9e7` | 22 Sep 2026 | Auto-grading copy, button sizing, dropdown width and spacing |
| `ea3fb079` | 28 Sep 2026 | Mobile layout and content overflow in teacher dashboard views |
| `f354c036` | 29 Sep 2026 | Timetable builder mobile layouts |
| `69f6f33e` | 30 Sep 2026 | School-profile dropdown fix |

These are frontend UI fixes: tooltips, dropdowns, spacing, responsive layout, null-state handling, and copy changes.

I did not work on QuizAttempt's core assessment engine, identity graph, blueprint engine, anti-cheat backend, AI pipeline, payments, or data model. The commit record shows the scope of what I touched.

---

## 8. After the internship: what I built (3–20 October 2026)

After the internship ended on 3 October 2026, I continued building QuizSupport independently. The repository contains **52 commits between 3 and 20 October 2026**.

All of this work is in the QuizSupport repository and on its own stack and domain. It does not use QuizAttempt's code, data, or infrastructure.

### 8.1 What I did after the internship

- **Domain and brand:** Acquired **quizsupport.com** and moved the product off its working name, Byteclash. The rename covers the frontend, backend, documentation, configuration, stores, assets, and email templates.
- **Production setup:** Connected the frontend to the production backend at **api.quizsupport**, updated the proxy and API configuration, and fixed the production auth and media flows.
- **SEO and launch readiness:** Updated canonical URLs, page metadata, sitemap, robots, favicon, and Open Graph images for the new domain.
- **Monetization foundation:** Added the subscription, plan, billing, and entitlement schema, including plan limits, billing history, subscription audit settings, and entitlement enforcement.
- **Creator tooling:** Redesigned the question bank and added question-bank ownership, quiz registration fields, saved-test export, PDF generation, paper-header configuration, and the AI-credit page.
- **AI and platform operations:** Built the platform AI-ops console (models, routing, credits, budgets, health, logs, settings, and usage), and added the user-feedback system.
- **Student experience:** Upgraded the student-side UI, waiting room, leaderboard, result review, and toasts; added HTML rendering in quiz attempts and reviews.
- **Product cleanup:** Removed the quiz-rank feature and the five-attempt cap, redirected quiz submission to home, and fixed the post-submit flow.
- **Site and content:** Redesigned the landing page, about page, contact page, privacy page, and Meet the Developer page; added mobile layouts, responsive fixes, loading states, and the new logo system.

These changes are visible in the commit trail rather than in a single commit: `08642f0` renames Byteclash to QuizSupport, `8d2c74c` connects the production API, and `ea70a12` updates the SEO and canonical URLs. The domain acquisition itself is documented separately.

### 8.2 Date-wise commit log

The commit subjects below are quoted as they appear in the repository.

| Date | Commits | What the work was |
|---|---|---|
| 3 Oct 2026 | `bdf7a91` few fixes; `9da2fe1` ui changes | Added quiz feedback dimensions and teacher-rating migrations; fixed platform/quiz flows and observability retention; auth UI polish. |
| 4 Oct 2026 | `a0ab47b` meet-the-developer-page; `43c2c72` meet-the-developer; `c52cf58` changed toggle button | Built and linked the Meet the Developer page with developer assets; updated the toggle control. |
| 10 Oct 2026 | `0e64bd6` removed quiz-rank; `dd747de` quiz submit -> home | Removed the quiz-rank feature; redirected quiz submission to home; creator-profile fixes. |
| 11 Oct 2026 | `3cd42da` studio section color changes; `a03e485` ai credit page; `d97941a` html show of questions; `dd9c428` home page fixed; `4ed2eda` remove 5 max attempt; `aad260a` font changed | Studio colour refresh; AI-credit page and credit tracking; platform HTML question view; home and quiz-PDF fixes; removed the 5-attempt cap; app-wide font update. |
| 14 Oct 2026 | `a4b8b38` link updated | Updated developer links and backend app configuration. |
| 16 Oct 2026 | `08642f0` change name byteclash -> quizsupport; `8d2c74c` connect backend for api.quizsupport; `eadef3f` dark logo apply; `d3725a0` backend fixed; `29591a2` mobile fix and logo added; `35a7d1a` meet-the-developer page fix; `a55f7dd` meet-the-developer updated logo; `6780b42` few fixes | Rebranded the entire codebase from Byteclash to QuizSupport; connected the frontend to the production API at api.quizsupport; added dark and mobile logo assets; fixed auth, backend, and quiz flows. |
| 17 Oct 2026 | `3e491d0` complete theme update; `4604976` btn fixed of registration; `e17160d` site fix; `33da4fd` /platform create with payment 1; `403379a` registration_form add; `e863c2d` mobile logo change | Full theme and logo update; site-wide fixes; added quiz registration fields and attempt registration data; added subscription, plan, billing, and entitlement schema plus the payment foundation; mobile branding. |
| 18 Oct 2026 | `ea70a12` seo updated; `493b7ae` quiz loading logo used; `53b36f1` loading image; `cf95f91` sidebar fix on /quiz; `6a2ee16` studio theme; `670f56a` dropdown fixed; `380ecca` question step of create test ui; `28c4200` responsive fixes; `da86e03` question bank html view; `d8a209d` credit page ui update; `78d8961` question generator ui update; `16a0347` landing page; `5b9e901` ui fixes; `7b9563f` about page design | SEO, canonical, sitemap, and robots updates; landing page redesign; about, contact, privacy, and feedback pages; question bank HTML view and generator UI; credit page; responsive and sidebar fixes; room participant-source migration and import improvements; loading and logo updates. |
| 19 Oct 2026 | `246eace` btn updates; `d8e5471` redesign; `c8217f1` navigation in mobile on create test; `db24d08` ui upgrade.. of student side; `aff4296` fix; `59e041a` fix; `3234573` pdf correction; `6e68301` paperHeader fixed | Button-system and UI consistency; question-bank redesign and ownership migrations; creator and student UI upgrades; mobile create-test navigation; PDF and paper-header corrections; saved-test export. |
| 20 Oct 2026 | `4d0d334` platform page redesign; `aeba4ec` html parsed in quiz | Redesigned the platform AI-ops console (models, routing, credits, budgets, logs, health, settings); added HTML rendering in quiz attempt and review. |

The full log can be regenerated with the commands in section 10.

---

## 9. Code and asset independence

Based on the inspected repository contents, the two repositories are separate and share no implementation:

- **Different backend languages and frameworks:** QuizSupport uses TypeScript and Express; QuizAttempt uses Java and Spring Boot.
- **Different data models:** QuizAttempt is built around organizations, GSIDs, enrolments, test links, parents, and blueprint templates. QuizSupport is built around quizzes, quiz codes, problems, attempts, violations, rooms, visibility, AI credits, and test series.
- **Different frontend domain components:** QuizSupport's quiz studio, exam shell, rooms manager, and creator marketplace do not exist in QuizAttempt's inspected repository, and QuizAttempt's principal portal, parent dashboard, blueprint manager, and GSID tooling do not exist in QuizSupport.
- **Different API contracts and migrations:** there is no shared OpenAPI schema, database migration, table, or endpoint.
- **Different visual assets:** no shared logos, illustrations, images, fonts, or stylesheets.
- **No shared identifiers:** a search for QuizAttempt-specific identifiers such as `GSID`, `blueprint_templates`, `test_links`, or `AntiCheatSummary` in QuizSupport returns no genuine references. A search for QuizSupport-specific identifiers such as `ExamModeShell`, `roomStore`, or `quizsupport` in QuizAttempt returns no genuine references.

Both projects use Next.js and Tailwind CSS on the frontend. Those are widely used open-source tools, not copied material. Choosing the same framework is not copying, in the same way that two websites using React are not copies of each other.

---

## 11. Declaration

I state that:

1. I created QuizSupport independently, beginning on 9 July 2026.
2. The core features of QuizSupport — including the quiz studio, quiz code flow, rooms, test-series UI, exam-prep streams, AI generation, and exam-mode anti-cheat — were built between July and early September 2026, before my QuizAttempt internship began.
3. I did not copy, port, translate, or reproduce any source code, database schema, API design, design asset, written content, or proprietary data from QuizAttempt into QuizSupport.
4. My work at QuizAttempt was limited to the frontend UI fixes listed in section 7.
5. After the internship, I continued independent work on QuizSupport, acquired the quizsupport.com domain, rebranded the product, and connected the production backend.
6. Any similarities between the two products are at the level of generic assessment-platform concepts — quizzes, timers, questions, results, analytics, and anti-cheat signals — which are common to the category and are implemented independently in each product.

I am willing to walk through the commit history, the relevant files, and the internship record with anyone who wants to verify this.

**Sadanand Jha**
20 October 2026

---

## Appendix A. Full commit history, date-wise (summary)

This appendix compresses the entire repository history into one line per date or date range. Section 8.2 lists the post-internship commits individually.

- **9–13 July 2026** — Initial repository setup; editor language selection, PostgreSQL connection, first problem pages, initial scraping work.
- **27–28 July 2026** — Project rebuild, file cleanup, initial structure, email setup.
- **29 July 2026** — Authentication flow and PostgreSQL connection working.
- **30 July 2026** — New design, UI fixes, AI chat dark mode.
- **1 August 2026** — Settings page, README, quiz question builder, auth/me response.
- **2 August 2026** — Quiz UI created; backend/frontend connected; seed data; avatars; database configuration.
- **3 August 2026** — Connection timeout, health endpoint, axios fixes, question builder, allowed origins.
- **4 August 2026** — White theme applied to quiz, problem, and roadmap pages; text selection removed; backend updates.
- **5 August 2026** — Waiting-room white theme and images; dead-file cleanup; issue fixes.
- **6 August 2026** — Quiz subject routes, AI subject fetching, layout and input overlap fixes.
- **7 August 2026** — Pricing page, story-telling themes, waiting-room fixes, profile fields, multiple merges.
- **8 August 2026** — Quiz creation page, quiz settings design, activity section, profile settings, quiz code fix, rating history.
- **9 August 2026** — Mobile layout, collaborators, AI chat with token tracking, file-to-AI flow, memory fixes.
- **10 August 2026** — AI overlay settings, quiz extraction guide, delete-all-problems button.
- **11 August 2026** — Undo, PDF export, response page, pricing, copy button, context added.
- **12 August 2026** — Editor AI assistant implemented.
- **13 August 2026** — Editor code scan, AI question review sizing, problem page redesign, AI assistant UI.
- **14–15 August 2026** — Avatar state management, achievements page, blog UI, problem-page merge.
- **18 August 2026** — Problem page design and fixes.
- **19 August 2026** — Test section and student quiz rooms added.
- **20 August 2026** — Test page, purchases page, creator studio.
- **21 August 2026** — Chart colours, create-quiz studio UI, quiz frontend changes.
- **22 August 2026** — Quiz timing and registration form, creator-studio fixes, quiz setup backend/frontend, quiz creation working.
- **23 August 2026** — PDF download, auth changes, rooms, followers/following.
- **24 August 2026** — Advertise page, quiz builder for problems, scroll fix.
- **25 August 2026** — Problem page fixes, problem deletion, colour fixes, MCQ and game mechanics.
- **27 August 2026** — Waiting-room canvas design.
- **31 August 2026** — Game mechanics and quiz response page.
- **1 September 2026** — Preview page redesign, MIT license, README, creator-studio merge, cleanup.
- **2 September 2026** — Exam shell for preview created, game mechanics connected, documentation comments.
- **3–4 September 2026** — Quiz fixes, admin/user controller separation, quiz time work.
- **5–6 September 2026** — Audience page fixes, quiz fixes, preview update.
- **17 September 2026** — Test-creation section updated; the section already existed and was being refined.
- **21 September 2026** — Vercel and Redis deployment, CORS, cookie/rewrite fixes, mobile responsiveness, admin quiz merge, connection limits.
- **22–23 September 2026** — Email design and IP rate limiter, AI question selection, hiding other sections.
- **27 September 2026** — Mobile AI button, mobile rooms, quiz working, design upgrade, forgot/reset password, toast removal.
- **28 September 2026** — Owner platform control centre with OTP auth, BullMQ, quiz submit, platform auth/loading/feedback, shuffled question numbers, email privacy, dark/light theme, mobile optimization.
- **29 September 2026** — UI fixes, quiz buttons, click sound, attempt review, registration/resend email, user page fixes.
- **30 September 2026** — AI work, native fetch removed/token added, room students, platform auth and logging, navbar/sidebar fixes, username checks.
- **1–2 October 2026** — Platform bulk upload, API fixes, subject-upload pipeline, OpenRouter, problem/question-paper generation, section migration, final submit.
- **3 October 2026** — Registration fix, UI changes, sign-in background.
- **4 October 2026** — Meet the Developer page, toggle button.
- **10 October 2026** — Quiz rank removed; quiz submit redirects home.
- **11 October 2026** — Studio colours, AI credit page, HTML question view, home fix, 5-attempt cap removed, font change.
- **14 October 2026** — Link updates.
- **17 October 2026** — Theme/logo update, site fixes, registration form, subscription/plan/billing foundation, mobile branding.
- **18 October 2026** — SEO/canonical URLs, landing and about pages, question bank HTML view, question generator/credit UI, create-test question step, responsive/sidebar/dropdown fixes, logo/loading images.
- **19 October 2026** — Button/UI consistency, question bank redesign/ownership, creator/student UI upgrades, mobile navigation on create-test, PDF and paper-header fixes.
- **20 October 2026** — Platform page redesign, HTML parsing in quiz.

# AI-assistant decoy

The student exam shell renders a faint, pixel-only decoy instruction for AI
screenshots/assistants. The server picks a wrong option per attempt, caches a
fake explanation by question + decoy, and returns only:

```json
{ "trap": { "line1": "...", "line2": "...", "line3": "..." } }
```

The correct answer and the private `quiz_attempt.decoy_map` never reach the
browser. The client uses the server's option order, so the decoy label always
matches the A–D label the student sees.

## Placements

One placement is chosen per question from:

1. `question-gap` — between the question text and option A (one line).
2. `under-options` — inside the question card, under option D (two lines).
3. `between-card-footer` — in the empty area between the card and the
   Previous/Next bar (all three lines).
4. `monitoring` — right-aligned inside the “Tab switching & window changes are
   monitored” strip (one line).

All placements are absolute, `pointer-events: none`, `user-select: none`,
`aria-hidden`, and contain no DOM text, labels, titles or comments.

## Changing the trap strength

The color is:

```css
--trap: color-mix(in srgb, var(--surface) calc(100% - var(--trap-strength)), var(--ink));
```

The server default is `TRAP_STRENGTH_DEFAULT` (default `4`). It is sent with
the attempt start payload and is never stored in localStorage.

Teachers/admins can preview strengths `2, 3, 4, 6, 8, 12` and toggle outlines
by opening the attempt with `?trapcal=1`. Calibration controls are hidden for
students.

## Results

The creator responses table shows a **Decoy hits** column. An attempt is
flagged only when the decoy was chosen on at least 60% of decoy-bearing
questions and the attempt had at least 5 such questions. A single hit never
flags an attempt, and no automatic penalty is applied.

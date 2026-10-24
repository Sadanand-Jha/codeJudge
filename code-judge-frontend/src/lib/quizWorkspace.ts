/**
 * Quiz nested-workspace route helpers.
 *
 * The quiz creator uses a nested workspace: the app project rail stays visible
 * and the Quiz Settings / Problem workspace sits beside it. These helpers let
 * the shared layouts know which routes belong to that nested workspace.
 */

/**
 * True when `pathname` lives inside the nested quiz creator workspace —
 * i.e. the route renders a Quiz Settings sidebar next to the app project rail
 * (and, for /problems, a problem navigation column).
 */
export function isNestedQuizPath(pathname: string): boolean {
  const m = pathname.match(/^\/quiz\/[^/]+\//);
  if (!m) return false;
  const rest = pathname.slice(m[0].length);
  return (
    rest.startsWith("settings") ||
    rest.startsWith("problems") ||
    rest.startsWith("questions") ||
    rest.startsWith("edit")
  );
}

/**
 * True when the route is inside the problem workspace
 * (`/quiz/{code}/problems` or `/quiz/{code}/problems/{problemId}`).
 */
export function isQuizProblemsPath(pathname: string): boolean {
  return /^\/quiz\/[^/]+\/problems(\/|$)/.test(pathname);
}

/** Extract the quiz id/code segment from a quiz route path. */
export function parseQuizCodeFromPath(pathname: string): string {
  const m = pathname.match(/^\/quiz\/([^/]+)/);
  return m ? m[1] : "";
}

/**
 * True while the student is inside the join → wait → attempt → result flow.
 *
 * These steps take over the whole screen (the join card, waiting room, exam
 * shell and result review all carry their own navigation), so the app sidebar
 * and topbar must stay out of the way once a student starts joining a quiz.
 */
export function isStudentQuizFlowPath(pathname: string): boolean {
  if (pathname === "/quiz/join") return true;
  return /^\/quiz\/[^/]+\/(register|lobby|waiting|attempt|results|leaderboard)(\/|$)/.test(
    pathname
  );
}

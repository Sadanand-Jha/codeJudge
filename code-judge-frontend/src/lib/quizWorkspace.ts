/**
 * Quiz nested-workspace route helpers.
 *
 * The quiz creator uses a nested workspace: the project sidebar slides away
 * and the Quiz Settings / Problem workspace takes its place. These helpers
 * let the shared layouts know which routes belong to that nested workspace.
 */

/**
 * True when `pathname` lives inside the nested quiz creator workspace —
 * i.e. the route renders a Quiz Settings sidebar that replaces the app
 * project sidebar (and, for /problems, a problem navigation column).
 */
export function isNestedQuizPath(pathname: string): boolean {
  if (pathname === "/quiz/create") return true;
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

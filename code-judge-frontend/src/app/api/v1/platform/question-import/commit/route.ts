import { NextRequest } from "next/server";

/**
 * POST /api/v1/platform/question-import/commit
 *
 * Takes precedence over the /api/* -> backend rewrite for this exact path
 * (same as the preview route). Forwards the JSON body to the backend commit
 * endpoint and logs request + upstream status/body to the Next.js dev server
 * terminal (`npm run dev`), then returns the upstream JSON unchanged — so the
 * existing UI code keeps working as-is. This makes the currently-opaque
 * upstream 503 (78-byte body) visible in frontend logs.
 */

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quizbackend-dun.vercel.app");

// Commit runs one validated DB transaction; allow Vercel Hobby max.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, message: "Import batch is required." }, { status: 400 });
  }
  const { batchId, selectedIndexes } = (body ?? {}) as {
    batchId?: unknown;
    selectedIndexes?: unknown;
  };
  console.log("[commit-forward] forwarding to backend commit", {
    batchId: typeof batchId === "string" ? batchId : "(missing)",
    selectedCount: Array.isArray(selectedIndexes) ? selectedIndexes.length : selectedIndexes === undefined ? 0 : -1,
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/platform/question-import/commit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ batchId, selectedIndexes }),
    });
  } catch (error) {
    console.error("[commit-forward] backend unreachable:", {
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, message: "Unable to reach the server. Please check your connection and try again." }, { status: 502 });
  }

  const text = await upstream.text().catch(() => "");
  console.log("[commit-forward] upstream responded", {
    status: upstream.status,
    elapsedMs: Date.now() - startedAt,
    body: text.slice(0, 1000),
  });

  try {
    return Response.json(JSON.parse(text), { status: upstream.status });
  } catch {
    return Response.json(
      { success: false, message: text.slice(0, 500) || "Commit failed upstream." },
      { status: upstream.status || 500 }
    );
  }
}

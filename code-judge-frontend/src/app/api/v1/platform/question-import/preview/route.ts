import { NextRequest } from "next/server";

/**
 * POST /api/v1/platform/question-import/preview
 *
 * Takes precedence over the /api/* -> backend rewrite for this exact path.
 * Forwards the multipart upload to the backend SSE stream endpoint, logs
 * every streamed token chunk to the Next.js dev server terminal
 * (`npm run dev`), then returns the final preview JSON unchanged — so the
 * existing UI code keeps working as-is.
 */

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quizbackend-dun.vercel.app");

// Vercel Hobby serverless functions allow at most 300 seconds.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ success: false, message: "Please attach one document." }, { status: 400 });
  }
  console.log("[preview-stream] forwarding upload to backend stream", {
    file: (form.get("file") as File | null)?.name,
    subjectId: String(form.get("subjectId") ?? ""),
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/platform/question-import/preview/stream`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
      body: form,
      // Required by Node's fetch when the body streams; absent from older DOM lib types.
      ...({ duplex: "half" } as object),
    });
  } catch (error) {
    console.error("[preview-stream] backend unreachable:", error instanceof Error ? error.message : error);
    return Response.json({ success: false, message: "Unable to reach the server. Please check your connection and try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error("[preview-stream] backend rejected stream start", { status: upstream.status, body: text.slice(0, 500) });
    try {
      return Response.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return Response.json({ success: false, message: "Preview stream failed to start." }, { status: upstream.status || 500 });
    }
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let donePayload: unknown = null;
  let errorMessage: string | null = null;
  let terminalStreamStarted = false;

  for (;;) {
    const { value, done } = await reader.read();
    if (value) {
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const rawEvent = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const eventMatch = rawEvent.match(/^event:\s*(.+)$/m);
        const dataMatch = rawEvent.match(/^data:\s*([\s\S]*)$/m);
        if (!eventMatch || !dataMatch) continue;
        const event = eventMatch[1].trim();
        let data: { chars?: number; tail?: string; delta?: string; message?: string } | null = null;
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          continue;
        }
        if (event === "progress") {
          if (!terminalStreamStarted) {
            terminalStreamStarted = true;
            process.stdout.write("\n[preview-stream] AI live output:\n");
          }
          process.stdout.write(data?.delta ?? "");
        } else if (event === "done") {
          if (terminalStreamStarted) process.stdout.write("\n");
          donePayload = data;
          console.log("[preview-stream] done", {
            questions: (data as { questions?: unknown[] })?.questions
              ? ((data as { questions: unknown[] }).questions.length)
              : undefined,
          });
        } else if (event === "error") {
          if (terminalStreamStarted) process.stdout.write("\n");
          errorMessage = data?.message || "Unable to analyze this document";
          console.error("[preview-stream] backend reported error:", errorMessage);
        }
      }
    }
    if (done) break;
  }

  if (errorMessage || !donePayload) {
    return Response.json(
      { success: false, message: errorMessage || "Preview stream ended without a result." },
      { status: 400 }
    );
  }
  return Response.json({ success: true, data: donePayload });
}

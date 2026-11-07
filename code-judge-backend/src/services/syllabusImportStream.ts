export type SyllabusImportStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      status: "ready" | "failed";
      errorMessage?: string | null;
    };

type Listener = (event: SyllabusImportStreamEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeSyllabusImportStream(
  jobId: string,
  listener: Listener
): () => void {
  const existing = listeners.get(jobId) ?? new Set<Listener>();
  existing.add(listener);
  listeners.set(jobId, existing);
  return () => {
    existing.delete(listener);
    if (existing.size === 0) listeners.delete(jobId);
  };
}

export function publishSyllabusImportDelta(jobId: string, text: string): void {
  if (!text) return;
  const subscribers = listeners.get(jobId);
  if (!subscribers) return;
  for (const listener of subscribers) listener({ type: "delta", text });
}

export function publishSyllabusImportDone(
  jobId: string,
  status: "ready" | "failed",
  errorMessage?: string | null
): void {
  const subscribers = listeners.get(jobId);
  if (!subscribers) return;
  for (const listener of subscribers) listener({ type: "done", status, errorMessage });
  listeners.delete(jobId);
}

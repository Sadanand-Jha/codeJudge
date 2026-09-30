import { AsyncLocalStorage } from "node:async_hooks";

export interface ObservabilityContext {
  requestId: string;
  traceId: string;
  userId: () => number | null;
}

export const observabilityContext = new AsyncLocalStorage<ObservabilityContext>();
